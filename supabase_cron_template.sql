-- ANTHONY ENGLISH COACH v1.1 - 매일 19:00 KST 알림 Cron 템플릿
-- 먼저 Edge Function english-daily-reminder를 배포하고 Supabase Secrets를 설정하세요.
-- 아래 <PROJECT_REF>와 <CRON_SECRET>는 직접 입력해야 합니다. 비밀값을 GitHub에 커밋하지 마세요.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('anthony-en-reminder-19kst')
where exists (select 1 from cron.job where jobname='anthony-en-reminder-19kst');

select cron.schedule(
  'anthony-en-reminder-19kst',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/english-daily-reminder',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret','<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
