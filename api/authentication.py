from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken


class QueryParamJWTAuthentication(JWTAuthentication):
    """
    Autenticação JWT que aceita token via query parameter (?token=xxx)
    além do header Authorization normal.
    Útil para endpoints que são abertos em nova tab (ex: download de PDF).
    """

    def authenticate(self, request):
        # Primeiro tenta o header normal
        header_result = super().authenticate(request)
        if header_result is not None:
            return header_result

        # Se não há header, tenta query parameter
        raw_token = request.query_params.get('token')
        if raw_token is None:
            return None

        # Validar o token
        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except (InvalidToken, TokenError):
            return None