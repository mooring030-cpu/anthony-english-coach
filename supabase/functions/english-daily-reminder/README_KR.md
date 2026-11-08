# 영어 앱 오후 7시 미학습 Push 알림

이 함수는 `english_push_subscriptions`의 활성 구독을 읽고, 당일 `english_learning_progress.state.lastStudy`가 오늘 날짜가 아닌 사용자에게만 Push를 발송합니다.

## Supabase Secrets
아래 값은 GitHub에 올리지 말고 Supabase Edge Function Secrets에 저장하세요.

- `VAPID_PUBLIC_KEY` : 앱에 들어간 공개키
- `VAPID_PRIVATE_KEY` : 별도 전달된 PRIVATE_SETUP 파일의 비밀키
- `CRON_SECRET` : 별도 전달된 PRIVATE_SETUP 파일의 값
- `VAPID_SUBJECT` : `mailto:본인이메일@example.com` 형태 권장

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase Edge Function 기본 환경에서 제공되는 값을 사용합니다.

## 스케줄
한국시간 오후 7시는 UTC 10:00입니다. 매일 실행 Cron 표현식은 `0 10 * * *` 입니다.

함수 호출 시 HTTP Header에 `x-cron-secret: <CRON_SECRET>`를 반드시 포함하세요.

## 배포 시 JWT 설정
Cron 요청은 사용자 로그인 JWT가 아니라 `x-cron-secret`으로 보호합니다. 따라서 이 함수는 `verify_jwt = false`로 배포해야 합니다. 저장소의 `supabase/config.toml`을 사용하거나 CLI에서 `supabase functions deploy english-daily-reminder --no-verify-jwt`로 배포하세요.
