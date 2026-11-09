# YOMIAN ENGLISH v1.3.0

이번 버전은 최신 YOMIAN JAPANESE v6.11.6의 공통 UX를 영어 앱 구조에 맞게 선별 이식한 업데이트입니다.

## GitHub 업데이트 방법
기존 `anthony-english-coach` 저장소에 v1.3.0 패치 파일을 그대로 덮어쓴 뒤 GitHub Desktop에서:

1. `Commit to main`
2. `Push origin`

을 실행합니다.

Supabase SQL 재실행은 필요하지 않습니다.

## 기존 사용자 데이터
아래 항목은 변경하지 않았습니다.

- Supabase 로그인 계정
- 영어 학습기록 저장 key
- 2,358개 콘텐츠 ID
- PWA id / start_url / scope
- 알림 구독 구조

따라서 기존 학습기록과 계정을 그대로 이어서 사용할 수 있습니다.

## v1.3.0 주요 추가 기능
- 학습 위치 자동 저장 / 이어하기
- 오늘 완료 영역의 복습 / 추가학습 선택
- 문제 수 5/10/15/20/30
- 복습 기본 간격 1/3/7일 + 자동 증가
- 자동백업 복원
- IndexedDB 보조 저장
- 월간 출석 캘린더
- 새 뉴트럴 UI
- 모바일 하단시트
- 44px 터치 타깃 / 키보드 포커스 / reduced-motion

## PWA 설정
메인 앱은 계속 아래 값을 사용합니다.

- id: `/anthony-english-coach/`
- start_url: `/anthony-english-coach/`
- scope: `/anthony-english-coach/`

일본어 앱 `/japanese-coach/`와 충돌하지 않습니다.

## Smart Update
v1.2.x에서 적용한 Smart Update는 유지됩니다.
학습 중에는 새 버전을 강제로 적용하지 않고, 홈 화면 등 안전한 시점에 자동 적용합니다.
