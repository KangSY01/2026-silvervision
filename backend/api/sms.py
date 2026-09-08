"""
솔라피(Solapi) SMS 발송 모듈.

응급 이벤트가 `notified`로 전환될 때(EmergencyNotifyView) 연동된 보호자에게
실제 문자를 보낸다. 자세 추정/낙상 감지 같은 AI 경계와 무관하게, "이미 만들어진
알림 이력을 외부 채널로 전파"하는 백엔드 책임 범위 안이다.

설계 원칙:
- SOLAPI_API_KEY가 비어 있으면(테스트/CI 등) 실제 API를 호출하지 않고 로그만 남긴
  뒤 True를 반환한다. 85건 테스트가 매번 과금·실패하지 않도록 하는 안전장치다.
- 발송 실패(API 에러/타임아웃 등)는 예외를 삼키고 False를 반환한다. SMS 실패가
  EmergencyNotification 생성 자체를 롤백시키면 안 된다 — 알림 이력은 남아야 한다.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_MESSAGE_TEMPLATE = (
    '[실버비전] {name}님에게 응급 상황이 감지되어 확인이 필요합니다. '
    '앱에서 확인해주세요.'
)


def send_emergency_sms(guardian, senior, event) -> bool:
    """
    보호자에게 응급 상황 안내 SMS를 발송한다.

    성공(또는 테스트 환경 스킵) 시 True, 실패 시 False. 예외는 절대 밖으로
    던지지 않는다.
    """
    to_number = (guardian.phone or '').strip()
    if not to_number:
        logger.warning(
            'emergency SMS skipped: guardian %s has no phone (event %s)',
            getattr(guardian, 'guardian_id', '?'),
            getattr(event, 'event_id', '?'),
        )
        return False

    text = _MESSAGE_TEMPLATE.format(name=senior.name)

    if not settings.SOLAPI_API_KEY:
        logger.info(
            'emergency SMS skipped (SOLAPI_API_KEY unset): would send to %s '
            '(event %s): %s',
            to_number,
            getattr(event, 'event_id', '?'),
            text,
        )
        return True

    try:
        from solapi import SolapiMessageService
        from solapi.model import RequestMessage

        message_service = SolapiMessageService(
            api_key=settings.SOLAPI_API_KEY,
            api_secret=settings.SOLAPI_API_SECRET,
        )
        message = RequestMessage(
            from_=settings.SOLAPI_SENDER_NUMBER,
            to=to_number,
            text=text,
        )
        message_service.send(message)
        logger.info(
            'emergency SMS sent to %s (event %s)',
            to_number,
            getattr(event, 'event_id', '?'),
        )
        return True
    except Exception:
        logger.exception(
            'emergency SMS failed to %s (event %s)',
            to_number,
            getattr(event, 'event_id', '?'),
        )
        return False
