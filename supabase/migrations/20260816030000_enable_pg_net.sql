-- invitation_mentors Database Webhook(대시보드에서 수동 생성 예정)이 Edge Function을
-- 호출하는 데 필요한 확장. pg_cron은 이미 켜져 있고(20260804020000), pg_net은 이번이 처음.
create extension if not exists pg_net with schema extensions;
