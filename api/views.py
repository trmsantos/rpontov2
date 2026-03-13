import re
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

FUNC_USERNAME_RE = re.compile(r'^F\d{3,5}$', re.IGNORECASE)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_lookup(request):
    """
    Passo 1: Utilizador envia o email.
    Se encontrar um user com username FXXXXX e esse email, devolve o username.
    """
    email = (request.data.get('email') or '').strip().lower()

    if not email:
        return Response({
            'status': 'error',
            'title':  'Introduza o seu email'
        })

    try:
        # Procurar user com este email e username no formato FXXXXX
        users = User.objects.filter(email__iexact=email)
        func_user = None
        for u in users:
            if FUNC_USERNAME_RE.match(u.username):
                func_user = u
                break

        if not func_user:
            return Response({
                'status': 'error',
                'title':  'Não foi encontrado nenhum colaborador com este email.'
            })

        return Response({
            'status':     'success',
            'username':   func_user.username,
            'first_name': func_user.first_name or '',
            'last_name':  func_user.last_name or '',
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'title':  f'Erro interno: {str(e)}'
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """
    Passo 2: Utilizador define a nova password.
    Recebe email + nova password. Valida novamente o email.
    """
    email        = (request.data.get('email') or '').strip().lower()
    new_password = (request.data.get('new_password') or '').strip()

    if not email or not new_password:
        return Response({
            'status': 'error',
            'title':  'Dados inválidos'
        })

    if len(new_password) < 6:
        return Response({
            'status': 'error',
            'title':  'A palavra-passe deve ter pelo menos 6 caracteres'
        })

    try:
        users = User.objects.filter(email__iexact=email)
        func_user = None
        for u in users:
            if FUNC_USERNAME_RE.match(u.username):
                func_user = u
                break

        if not func_user:
            return Response({
                'status': 'error',
                'title':  'Utilizador não encontrado'
            })

        func_user.set_password(new_password)
        func_user.save()
    
        print(f"[RESET] Password alterada para user={func_user.username} via email={email}")

        return Response({
            'status':   'success',
            'title':    'Palavra-passe alterada com sucesso!',
            'username': func_user.username,
        })

    except Exception as e:
        return Response({
            'status': 'error',
            'title':  f'Erro: {str(e)}'
        })