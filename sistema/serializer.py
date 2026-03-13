import re
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework import serializers
from django.db import connections, transaction
from django.contrib.auth import authenticate
from support.database import encloseColumn, Filters, DBSql, TypeDml, fetchall, Check

connMssqlName = "sqlserver"
db = DBSql(connections[connMssqlName].alias)

# Regex para validar username de funcionário: F seguido de dígitos (ex: F00242, F00012)
FUNC_USERNAME_RE = re.compile(r'^F\d{3,5}$', re.IGNORECASE)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    remember = serializers.BooleanField(required=False)

    def __init__(self, *args, **kwargs):
        self.request = kwargs['context']['request']
        super().__init__(*args, **kwargs)

    def validate(self, attrs):
        username = attrs.get('username', '').strip()

        # Bloquear login de users que não sejam funcionários
        if not FUNC_USERNAME_RE.match(username):
            raise serializers.ValidationError(
                {'detail': 'Acesso restrito. Use o seu número de funcionário (ex: F00242).'}
            )

        data = super().validate(attrs)
        if attrs.get('remember'):
            self.request.session.set_expiry(86400)
        return data

    @classmethod
    def get_token(cls, user):
        connection = connections[connMssqlName].cursor()
        token      = super().get_token(user)

        # ══════════════════════════════════════════════════════════
        # PASSO 1 — Número do funcionário
        # ══════════════════════════════════════════════════════════
        num = ''
        try:
            dnum = db.executeSimpleList(
                lambda: (
                    f"SELECT * FROM sagex3.ELASTICTEK.AUTILIS "
                    f"WHERE ADDEML_0='{user.email}'"
                ),
                connection, {}
            )['rows']
            if len(dnum) > 0:
                num = f"F{dnum[0].get('USR_0')[1:].zfill(5)}"
        except Exception as e:
            print(f"[WARN] Sage X3 não devolveu num para {user.email}: {e}")

        # ── Fallback: username do Django já é o número ──
        if not num and user.username:
            uname = user.username.strip().upper()
            if uname.startswith('F') and len(uname) >= 2:
                num = uname
            elif uname.isdigit():
                num = f"F{uname.zfill(5)}"
            print(f"[FALLBACK] num obtido do username: {num}")

        token['num'] = num
        print(f"[AUTH] user={user.email} → num={num}")

        # ══════════════════════════════════════════════════════════
        # PASSO 2 — Grupos e permissões
        # ══════════════════════════════════════════════════════════
        groups     = list(user.groups.all().values_list('name', flat=True))
        items      = {}
        isAdmin    = user.is_superuser
        isRH       = False
        isChefe    = False
        deps_chefe = []

        if 'all#100' not in groups:
            groups.append('all#100')

        for v in groups:
            grp = v.split('#')
            key = ''

            if grp[0] == 'admin':
                isAdmin = True
                continue

            if grp[0] == 'rh':
                isRH             = True
                key              = 'rh'
                permission_value = grp[1] if len(grp) == 2 else '200'

            elif grp[0] == 'chefe':
                isChefe          = True
                key              = 'chefe'
                permission_value = grp[1] if len(grp) == 2 else '200'

                if num and not deps_chefe:
                    try:
                        with connections[connMssqlName].cursor() as cur:
                            cur.execute("""
                                SELECT RTRIM(LTRIM(dep_codigo))
                                FROM rponto.dbo.rh_chefes_departamento
                                WHERE num_chefe = %s
                                  AND ativo = 1
                                ORDER BY dep_codigo
                            """, [num])
                            deps_chefe = [row[0] for row in cur.fetchall()]

                        if deps_chefe:
                            print(f"[OK] {num} → deps_chefe: {deps_chefe}")
                        else:
                            print(
                                f"[WARN] {num} está no grupo 'chefe' mas "
                                f"não tem registo activo em rh_chefes_departamento"
                            )
                    except Exception as e:
                        print(f"[ERROR] Leitura deps_chefe para {num}: {e}")
                elif not num:
                    print(f"[WARN] isChefe=True mas num está vazio — deps_chefe ficará []")

            elif len(grp) == 2 and grp[0].startswith('chefe_'):
                dep_code = grp[0].replace('chefe_', '').upper()
                isChefe  = True
                if dep_code not in deps_chefe:
                    deps_chefe.append(dep_code)
                key              = grp[0]
                permission_value = grp[1]

            elif len(grp) == 2:
                key              = grp[0]
                permission_value = grp[1]

            else:
                if v.startswith('Logistica'):
                    key = 'logistica'
                elif v.startswith('Produção'):
                    key = 'producao'
                elif v.startswith('Qualidade'):
                    key = 'qualidade'
                permission_value = (
                    100 if v.endswith('Operador') or v.endswith('Tecnico') else 200
                )

            if key:
                pv = int(permission_value)
                if key in items:
                    if items[key] < pv:
                        items[key] = pv
                else:
                    items[key] = pv

        # ══════════════════════════════════════════════════════════
        # PASSO 3 — dep e tp_hor
        # ══════════════════════════════════════════════════════════
        dep    = ''
        tp_hor = ''
        if num:
            try:
                with connections[connMssqlName].cursor() as cur:
                    cur.execute("""
                        SELECT TOP 1
                            RTRIM(LTRIM(dep))    AS dep,
                            RTRIM(LTRIM(tp_hor)) AS tp_hor
                        FROM rponto.dbo.time_registration
                        WHERE num    = %s
                          AND dep    IS NOT NULL AND dep    != ''
                          AND tp_hor IS NOT NULL AND tp_hor != ''
                        ORDER BY dts DESC
                    """, [num])
                    row = cur.fetchone()
                    if row:
                        dep    = row[0]
                        tp_hor = row[1]
                        print(f"[AUTH] {num} → dep={dep}, tp_hor={tp_hor}")
                    else:
                        print(f"[WARN] {num} não tem registos em time_registration")
            except Exception as e:
                print(f"[ERROR] Leitura dep/tp_hor para {num}: {e}")

        # ══════════════════════════════════════════════════════════
        # PASSO 4 — Token final
        # ══════════════════════════════════════════════════════════
        token['first_name'] = user.first_name
        token['last_name']  = user.last_name
        token['email']      = user.email
        token['groups']     = groups
        token['items']      = items
        token['isAdmin']    = isAdmin
        token['isRH']       = isRH
        token['isChefe']    = isChefe
        token['deps_chefe'] = deps_chefe
        token['dep']        = dep
        token['tp_hor']     = tp_hor

        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer