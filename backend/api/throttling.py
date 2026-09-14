from rest_framework.throttling import ScopedRateThrottle


class SeniorRegistrationThrottle(ScopedRateThrottle):
    """
    POST /guardian/{id}/seniors/ (피보호자 등록 시도) 전용 throttle.

    이 엔드포인트는 로그인이 필요하므로 IP가 아니라 인증된 보호자 계정
    단위로 제한하는 편이 정확하다(같은 공유 IP를 쓰는 여러 보호자를
    한 버킷으로 묶지 않고, 계정을 바꿔가며 IP 제한을 우회하는 것도 막는다).
    ScopedRateThrottle.get_cache_key는 인증된 요청이면 request.user.pk를
    기준으로 삼으므로 별도 오버라이드 없이 그대로 상속한다.

    주의: ScopedRateThrottle.allow_request()는 클래스에 지정한 scope를
    무시하고 `getattr(view, 'throttle_scope', None)`으로 뷰에서 다시
    읽어온다 - 뷰에 그 속성이 없으면 scope가 None이 되어 제한이 통째로
    비활성화된다. 이 뷰(GuardianSeniorListCreateView)에 throttle_scope를
    얹는 대신(다른 메서드/서브클래스에 의도치 않게 새어나갈 수 있어),
    이 클래스의 scope를 그대로 쓰도록 allow_request를 오버라이드한다.
    """

    scope = 'senior_registration'

    def allow_request(self, request, view):
        self.rate = self.get_rate()
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super(ScopedRateThrottle, self).allow_request(request, view)
