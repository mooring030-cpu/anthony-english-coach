# ANTHONY ENGLISH COACH v1.1.2

GitHub Pages + Supabase 기반 영어 학습 PWA입니다.

## v1.1.2 Smart Update

이번 버전부터 사용자가 패치 후 매번 새로고침할 필요가 없도록 Smart Update를 적용했습니다.

- 앱 실행 시 새 버전 확인
- 앱을 다시 활성화하거나 브라우저 탭으로 돌아올 때 새 버전 확인
- 온라인 복귀 시 새 버전 확인
- 앱을 오래 켜둔 경우 5분 간격으로 업데이트 확인
- 새 버전은 먼저 백그라운드에서 설치하고 대기
- 학습/퀴즈/Listening/Speaking/전체자료/설정/로그인 중에는 강제 새로고침 금지
- 홈 화면이며 팝업이 없는 안전한 상태에서만 자동 적용
- 업데이트 적용 시 페이지가 자동으로 한 번만 재로드됨
- 직전 버전 캐시를 함께 보존해 업데이트 전환 중 안정성 강화

### 중요한 1회성 안내
현재 사용 중인 v1.1.1에는 Smart Update 코드가 없으므로 **v1.1.2를 GitHub에 올린 직후에는 이번 한 번만 앱을 완전히 종료 후 다시 열거나 새로고침**해 주세요. v1.1.2가 한 번 로드된 이후부터는 향후 v1.1.3, v1.1.4 등의 패치를 사용자가 직접 새로고침하지 않아도 자동으로 감지·적용할 수 있습니다.

## v1.1.1 버그 수정 유지

- 홈 버튼 / ← 홈 / 학습완료 후 홈 이동 오류 수정
- 랭킹 점수 갱신 오류 수정
- 전체 학습자료 한글 검색 오류 수정
- 퀴즈 중복 보기 방지
- 선택한 CEFR 레벨과 다른 레벨의 학습자료가 시작되는 문제 수정
- 오늘의 10분 학습 완료 상태 표시 보강
- GitHub Pages 하위 경로 Push 알림 클릭 경로 수정
- 로그아웃 시 Push 구독 정리

## 학습 구성

- 총 학습 항목: **2,358개**
- CEFR A1 / A2 / B1 / B2 / C1
- 필수 단어, 회화, 문장 만들기, Listening, Speaking, 문법, 동사·시제, 전치사, 숙어
- Business English 10개 트랙: 이메일, 전화, 회의, 출장, 견적·RFQ, 납기·출하, 품질·클레임, 협상, 계약, 제품소개
- 미국식 / 영국식 TTS
- 복습 / 오답 / 출석 / 랭킹 / 관리자 / Supabase 동기화
- PWA 설치 / 오후 7시 미학습 Push 알림

## GitHub 업데이트 방법

기존 저장소의 파일을 v1.1.2 파일로 덮어쓴 뒤 GitHub Desktop에서:

1. 변경 파일 확인
2. Summary: `Smart Update v1.1.2`
3. `Commit to main`
4. `Push origin`

Supabase SQL은 다시 실행할 필요가 없습니다. 학습기록용 LocalStorage 키와 Supabase 테이블 구조도 변경하지 않았습니다.

## Smart Update 동작 원칙

업데이트를 발견해도 현재 학습 세션을 중단하지 않습니다. 새 Service Worker는 대기 상태로 유지되며, 사용자가 홈 화면으로 돌아온 뒤에만 활성화됩니다. 따라서 음성 재생, Speaking, 퀴즈 진행 위치가 패치 때문에 갑자기 끊기는 것을 방지합니다.

향후 새 버전을 만들 때는 `APP_VERSION`, Service Worker의 `SW_VERSION`/`CACHE_NAME`, HTML 정적 파일 버전 쿼리를 함께 올려야 합니다.

## 주요 파일

- `index.html` : 화면
- `styles.css` : 반응형 UI
- `content.js` : 2,358개 학습 콘텐츠
- `app.js` : 학습 로직 + Smart Update
- `cloud-auth.js` : 로그인·동기화·관리자·랭킹·Push 구독
- `cloud-config.js` : Supabase 공개 연결정보
- `service-worker.js` : PWA 캐시·Push 수신·안전한 업데이트 대기/활성화
- `supabase_english_setup.sql` : 영어 전용 DB
- `supabase/functions/english-daily-reminder/index.ts` : 오후 7시 알림 발송 함수
- `supabase_cron_template.sql` : 매일 실행 스케줄 템플릿

## 보안

- GitHub에는 anon/publishable key만 사용
- Service Role Key / VAPID Private Key / Cron Secret은 Supabase Secrets에만 저장
- PRIVATE_SETUP 파일은 GitHub에 업로드하지 않음
