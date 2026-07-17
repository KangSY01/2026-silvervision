from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import Guardian, Senior

ROLE_MODELS = {
    'senior': Senior,
    'guardian': Guardian,
}


class RoleBasedJWTAuthentication(JWTAuthentication):
    """
    Senior/Guardian은 하나의 AUTH_USER_MODEL로 통합하지 않고 각각 독립된
    테이블로 운영한다 (AGENTS.md 5장 인증 설계 참고). 토큰의 'role' 클레임
    으로 Senior/Guardian 중 어느 테이블에서 조회할지 정하고, 'user_id'
    클레임(실제 senior_id/guardian_id)으로 해당 인스턴스를 조회해
    request.user에 담는다.
    """

    def get_user(self, validated_token):
        role = validated_token.get('role')
        user_id = validated_token.get('user_id')

        model = ROLE_MODELS.get(role)
        if model is None or user_id is None:
            raise AuthenticationFailed(
                '토큰에 유효한 role/user_id 클레임이 없습니다.',
                code='token_missing_claims',
            )

        try:
            return model.objects.get(pk=user_id)
        except model.DoesNotExist:
            raise AuthenticationFailed(
                '사용자를 찾을 수 없습니다.', code='user_not_found',
            )
