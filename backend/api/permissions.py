from rest_framework.permissions import BasePermission

from .models import Guardian, GuardianSeniorMap, Senior


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
    반복하지 않도록 재사용 가능한 permission으로 만들었다 - 현재
    `IsSeniorSelf`는 시니어 프로필 / 미션 목록·생성·상태변경 / 세션
    시작(POST)·완료(PATCH) / 세션 피드백·활동로그·신체능력로그 쓰기
    뷰에서, `IsGuardianSelf`는 보호자 프로필 / 보호자-피보호자 매핑
    목록·등록·해제 뷰에서 쓰인다. 세션 목록/상세·활동로그의 **조회
    (GET)**는 매핑된 보호자도 봐야 해서 `IsSeniorSelfOrMappedGuardian`
    으로 넘어갔다 (본인 확인 로직 자체는 동일하게 재사용).

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


class IsSeniorSelfOrMappedGuardian(BasePermission):
    """
    URL의 `senior_id` 스코프에 대해 (a) 시니어 본인이거나 (b)
    `GuardianSeniorMap`으로 그 시니어와 연결된 보호자일 때만 허용한다.
    응급 이벤트의 `_visible_emergency_events`가 쓰는 "본인 소유 또는 매핑된
    보호자" 가시성 기준을, `senior_id`가 URL에 있는 **조회(GET) 전용**
    엔드포인트(세션 목록/상세, 활동 로그 조회)에 적용하기 위한
    permission이다. 쓰기(POST 세션 시작·활동로그 기록, PATCH 세션 완료)는
    시니어 본인만 가능해야 하므로 각 뷰의 `get_permissions()`가 GET에만
    이 클래스를, 그 외 메서드에는 `IsSeniorSelf`를 물린다.

    **매핑 안 된 보호자·타 시니어는 403** (`IsSeniorSelf`가 wrong senior에
    403을 주던 것과 동일). `senior_id` 스코프에 대한 접근 권한 판단은
    permission 계층의 몫이고, 그 스코프 안에서 특정 하위 리소스
    (`session_id` 등)의 존재 여부는 각 뷰 `get_queryset()`이 404로
    처리한다 — "권한 없음(403)"과 "자원 없음(404)"의 계층 분리
    (V6·미션/세션 PATCH와 동일). 응급 배치가 404로 통일한 건 URL에
    `senior_id`가 없어 스코프를 대조할 대상 자체가 없었기 때문이지
    404가 더 안전해서가 아니다.
    """

    def has_permission(self, request, view):
        senior_id = view.kwargs.get('senior_id')
        user = request.user
        if isinstance(user, Senior):
            return str(user.senior_id) == str(senior_id)
        if isinstance(user, Guardian):
            return GuardianSeniorMap.objects.filter(
                guardian=user, senior_id=senior_id,
            ).exists()
        return False


class IsSeniorOrGuardian(BasePermission):
    """
    응급 이벤트/카메라 접근 권한 엔드포인트는 URL에 senior_id가 없고
    event_id만 있어 IsOwnerSelf 계열(URL 파라미터 대조)을 쓸 수 없다.
    이 클래스는 "로그인 주체가 Senior 또는 Guardian 중 하나인가"만
    확인해 미인증 요청이 401로 처리되게 하고, "이 이벤트가 본인 소속
    또는 매핑된 보호자 소속인가"는 각 뷰의 get_queryset()이
    senior 본인/GuardianSeniorMap 기준으로 필터링해서 처리한다
    (V6·V7과 동일하게 queryset에 없으면 404).
    """
    def has_permission(self, request, view):
        return isinstance(request.user, (Senior, Guardian))
