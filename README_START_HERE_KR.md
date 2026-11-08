# ANTHONY ENGLISH COACH v1.1

기존 v1.0을 확장한 GitHub Pages + Supabase 기반 영어 학습 PWA입니다.

## v1.1 핵심 업데이트

- 총 학습 항목: **2,358개**
- CEFR A1 / A2 / B1 / B2 / C1
- 기본 영어 학습 + 반복 드릴 확대
- Business English 실무 트랙 10개 추가
  - 이메일
  - 전화
  - 회의
  - 출장
  - 견적·RFQ
  - 납기·출하
  - 품질·클레임
  - 협상
  - 계약
  - 제품소개
- 미국식 / 영국식 TTS
- Listening / Speaking / 문장 조립 / 복습 / 오답
- 로그인 / Supabase 클라우드 동기화 / 관리자 / 랭킹
- PWA 설치
- 오후 7시 미학습 Push 알림용 Edge Function 포함

## 1. GitHub 업데이트

기존 v1.0 저장소를 이미 만들었다면 이 폴더의 파일로 기존 저장소 파일을 덮어쓴 뒤 GitHub Desktop에서:

1. 변경 파일 확인
2. Summary: `Update ANTHONY ENGLISH COACH v1.1`
3. `Commit to main`
4. `Push origin`

새로 등록하는 경우:

1. GitHub → New repository → 예: `anthony-english-coach`
2. GitHub Desktop → File → Add local repository
3. 이 폴더 선택 → 필요 시 Create repository
4. Commit → Publish repository
5. GitHub 저장소 → Settings → Pages → Deploy from a branch → `main` / `/(root)` → Save

## 2. Supabase DB

처음 설치라면 `supabase_english_setup.sql` 전체를 SQL Editor에서 실행합니다. v1.0에서 이미 실행했다면 다시 실행해도 `if not exists` 중심이라 대부분 안전하게 유지됩니다.

## 3. cloud-config.js

기존 일본어 앱에서 사용하는 Supabase Project URL과 publishable/anon key를 `cloud-config.js`에 입력하세요. **Service Role Key는 절대 GitHub 파일에 넣지 마세요.**

## 4. 오후 7시 미학습 Push 알림

앱 화면의 구독 기능만으로는 서버가 자동 발송할 수 없기 때문에 v1.1에는 다음을 추가했습니다.

- `supabase/functions/english-daily-reminder/index.ts`
- `supabase/functions/english-daily-reminder/README_KR.md`
- `supabase_cron_template.sql`

### 반드시 별도로 보관할 파일
ZIP과 별도로 전달되는 `ANTHONY_English_Coach_v1_1_PRIVATE_SETUP.txt`에 VAPID 비밀키와 Cron secret이 있습니다. **이 파일은 GitHub에 올리면 안 됩니다.**

### 알림 설정 순서

1. Supabase Edge Function으로 `english-daily-reminder` 배포 (`supabase functions deploy english-daily-reminder --no-verify-jwt` 또는 Dashboard에서 JWT 검증 해제)
2. Supabase Function Secrets에 PRIVATE_SETUP 파일의 값을 저장
3. `VAPID_SUBJECT`를 본인 이메일 형식으로 설정
4. `supabase_cron_template.sql`의 `<PROJECT_REF>`와 `<CRON_SECRET>`를 입력
5. SQL Editor에서 실행
6. 앱에서 설정 → `오후 7시 미학습 알림` → 알림 켜기

Cron은 `0 10 * * *`로 설정되어 있으며, 이는 **매일 10:00 UTC = 한국시간 19:00**입니다.

## 5. v1.0 → v1.1 업데이트 시 학습기록

기존 LocalStorage 키와 Supabase 테이블을 유지하므로 v1.0 학습기록은 그대로 이어집니다. 새 콘텐츠와 Business English 트랙만 추가됩니다.

## 6. 주요 파일

- `index.html` : 화면
- `styles.css` : 반응형 UI
- `content.js` : 2,358개 학습 콘텐츠
- `app.js` : 학습·복습·듣기·말하기 로직
- `cloud-auth.js` : 로그인·동기화·관리자·랭킹·Push 구독
- `cloud-config.js` : Supabase 공개 연결정보
- `supabase_english_setup.sql` : 영어 전용 DB
- `supabase/functions/english-daily-reminder/index.ts` : 오후 7시 알림 발송 함수
- `supabase/config.toml` : 해당 알림 함수의 JWT 검증 해제 설정(함수 내부 Cron Secret으로 보호)
- `supabase_cron_template.sql` : 매일 실행 스케줄 템플릿
- `service-worker.js` : PWA 캐시·Push 수신

## 7. 보안

- GitHub에는 anon/publishable key만 사용
- Service Role Key / VAPID Private Key / Cron Secret은 Supabase Secrets에만 저장
- PRIVATE_SETUP 파일은 개인 보관하고 GitHub에 업로드하지 않음
