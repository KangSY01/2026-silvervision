- Senior/Guardian의 password_hash는 절대 로그(print, logger)에 
  출력하거나 API 응답에 포함시키지 않는다
- .env의 SECRET_KEY, DB_PASSWORD 등은 코드에 하드코딩하지 않고 
  반드시 os.getenv()로만 접근한다
- emergency_event, camera_access_grant 관련 API는 시니어 본인 또는 
  연동된 보호자(guardian_senior_map으로 확인)만 접근 가능해야 하며, 
  다른 시니어의 응급 데이터에 접근 가능한 IDOR(권한 우회) 취약점이 
  없는지 특히 주의한다
- GPS 위치 정보, 카메라 접근 권한(camera_access_grant)은 응급 상황 
  판별 시간 동안만 유효해야 하며, expires_at 체크 없이 무기한 
  접근 가능한 코드를 작성하지 않는다
- JWT 토큰에 role(senior/guardian) 클레임이 포함되므로, 뷰에서 
  role 검증 없이 senior 전용 데이터를 guardian 토큰으로 접근 
  가능하게 만들지 않는다
- Django ORM을 우선 사용하고, raw SQL이 꼭 필요한 경우 파라미터 
  바인딩 없이 문자열 포매팅으로 쿼리를 조립하지 않는다