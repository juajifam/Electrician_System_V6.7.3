전기기능사 실습실 예약·관리 시스템 - Supabase 공용 예약 연결본

1. Supabase > SQL Editor에서 SUPABASE_SETUP.sql 전체를 실행합니다.
2. 이 폴더 전체를 기존 GitHub 저장소에 덮어씁니다.
3. Termux에서 아래 명령을 한 줄씩 실행합니다.
   git add .
   git commit -m "Supabase shared reservations"
   git push
4. GitHub Pages 배포 후 서로 다른 휴대폰 2대로 같은 날짜 예약을 확인합니다.

이번 연결 범위
- 예약 생성: 공용 Supabase 저장
- 예약 조회: 모든 사용자가 공유
- 나의 예약 조회/취소: 공용 데이터 사용
- 관리자 예약 목록/삭제: 공용 데이터 사용
- 실시간 변경 감지: 적용
- 공지사항, 예약 마감 정보, 관리자 비밀번호: 기존 localStorage 유지

주의
- Publishable key는 브라우저용 공개 키입니다.
- Secret key/service_role 키는 코드에 넣지 않았습니다.
- 현재 로그인 기능이 없으므로 RLS 정책상 익명 사용자가 예약을 읽고 만들고 삭제할 수 있습니다.
  실제 부대 운영 전 관리자 인증 강화는 별도 단계로 진행해야 합니다.
