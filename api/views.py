import threading
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

User = get_user_model()


def _send_reset_email_async(user, uid, token):
    """Envia o email em background para não bloquear o pedido HTTP."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

    subject = "Portal RH — Recuperação de palavra-passe"
    text_body = (
        f"Olá {user.first_name or user.username},\n\n"
        f"Recebemos um pedido de recuperação de palavra-passe para a sua conta.\n\n"
        f"Clique no link abaixo para definir uma nova palavra-passe (válido 1 hora):\n\n"
        f"{reset_url}\n\n"
        f"Se não solicitou esta alteração, ignore este email — a sua conta está segura.\n\n"
        f"Portal RH | ElasticTek"
    )

    # Opcional: HTML bonito
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;
                border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#4F46E5;margin-bottom:4px;">Portal RH</h2>
      <p style="color:#6B7280;margin-top:0;">ElasticTek</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
      <p>Olá <strong>{user.first_name or user.username}</strong>,</p>
      <p>Recebemos um pedido de recuperação de palavra-passe para a sua conta
         <code style="background:#F3F4F6;padding:2px 6px;border-radius:4px;">
           {user.username}
         </code>.
      </p>
      <p>Clique no botão abaixo para definir uma nova palavra-passe.
         O link é válido durante <strong>1 hora</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{reset_url}"
           style="background:#4F46E5;color:#fff;text-decoration:none;
                  padding:14px 32px;border-radius:8px;font-weight:700;
                  font-size:15px;display:inline-block;">
          Recuperar palavra-passe
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:12px;">
        Se não solicitou esta alteração, ignore este email — a sua conta está segura.<br>
        Link direto: <a href="{reset_url}" style="color:#4F46E5;">{reset_url}</a>
      </p>
    </div>
    """

    try:
        send_mail(
            subject=subject,
            message=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_body,
            fail_silently=False,
        )
        print(f"[EMAIL] Reset enviado para {user.email}")
    except Exception as e:
        print(f"[ERROR] Falha ao enviar email de reset para {user.email}: {e}")


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response({'status': 'error', 'title': 'Email obrigatório.'}, status=400)

    users = User.objects.filter(
        email__iexact=email,
        username__istartswith='F'
    )

    if not users.exists():
        return Response({'status': 'success', 'title': 'Se o email existir, receberá um link.'})

    user = users.first()

    uid   = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    try:
        _send_reset_email_async(user, uid, token)
        print(f"[OK] Email enviado para {user.email} (username: {user.username})")
    except Exception as e:
        print(f"[ERRO SMTP] {e}")
        return Response({
            'status': 'error',
            'title': f'Erro SMTP: {str(e)}'
        }, status=500)

    return Response({'status': 'success', 'title': 'Email enviado.'})


# ─────────────────────────────────────────────────────────────
# POST /api/password-reset/confirm/
# Body: { "uid": "...", "token": "...", "new_password": "..." }
# ─────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """
    Passo 2: valida o token e aplica a nova password.
    """
    uid          = request.data.get('uid', '').strip()
    token        = request.data.get('token', '').strip()
    new_password = request.data.get('new_password', '')

    if not uid or not token or not new_password:
        return Response(
            {'status': 'error', 'title': 'Dados incompletos.'},
            status=400
        )

    if len(new_password) < 6:
        return Response(
            {'status': 'error', 'title': 'A palavra-passe deve ter pelo menos 6 caracteres.'},
            status=400
        )

    # Descodificar UID
    try:
        user_pk = force_str(urlsafe_base64_decode(uid))
        user    = User.objects.get(pk=user_pk)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return Response(
            {'status': 'error', 'title': 'Link inválido ou expirado.'},
            status=400
        )

    # Verificar token
    if not default_token_generator.check_token(user, token):
        return Response(
            {'status': 'error', 'title': 'Link inválido ou expirado. Solicite um novo.'},
            status=400
        )

    # Aplicar nova password
    user.set_password(new_password)
    user.save()
    print(f"[AUTH] Password alterada para {user.username} via token email")

    return Response({
        'status': 'success',
        'title': 'Palavra-passe alterada com sucesso.',
        'username': user.username
    })