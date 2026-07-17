from rest_framework.permissions import BasePermission

from .models import Guardian, Senior


class IsSenior(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Senior)


class IsGuardian(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Guardian)


class IsOwnerSelf(BasePermission):
    """
    URL의 {id}와 토큰 소유자 본인이 일치할 때만 허용하는 공통 로직
    (IDOR 방지, claude-security-guidance.md). 뷰마다 "본인 확인" if문을
    반복하지 않도록 재사용 가능한 permission으로 만들었다 - 지금 당장은
    senior/guardian 프로필 뷰 2곳이지만, AGENTS.md에 예정된
    `/senior/{id}/sessions/`, `/senior/{id}/activity-log/` 등 앞으로
    추가될 "본인 리소스만 접근" 엔드포인트에도 그대로 재사용된다.

    model/url_kwarg/user_pk_attr을 서브클래스에서 지정한다.
    """
    model = None
    url_kwarg = None
    user_pk_attr = None

    def has_permission(self, request, view):
        if not isinstance(request.user, self.model):
            return False
        url_value = view.kwargs.get(self.url_kwarg)
        return str(getattr(request.user, self.user_pk_attr)) == str(url_value)


class IsSeniorSelf(IsOwnerSelf):
    model = Senior
    url_kwarg = 'senior_id'
    user_pk_attr = 'senior_id'


class IsGuardianSelf(IsOwnerSelf):
    model = Guardian
    url_kwarg = 'guardian_id'
    user_pk_attr = 'guardian_id'
