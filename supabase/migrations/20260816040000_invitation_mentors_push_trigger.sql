-- invitation_mentors에 새 행이 생기면(수동 초대/자동배정 최초 생성/자동배정 재배정 전부 여기로
-- 귀결됨) send-invitation-push Edge Function을 호출해 대상 멘토에게 푸시 알림을 보낸다.
--
-- 이 프로젝트에는 Database Webhook을 한 번도 안 써서 supabase_functions 스키마가 없어(대시보드에서
-- 웹훅을 만들 때 처음 생성되는 듯), pg_net(20260816030000)을 직접 호출하는 트리거 함수를 둔다.
-- Authorization은 서비스 롤 키가 아니라 공개용 publishable(anon) 키를 쓴다 — 이 키는 애초에
-- 멘토 앱 클라이언트에도 그대로 박혀 공개되는 값이라 마이그레이션에 남아도 문제가 없고,
-- Edge Function 안에서는 어차피 자체 service-role 클라이언트로 다시 인증하므로 호출자의
-- 권한 수준은 verify_jwt 통과 여부에만 쓰인다.
create or replace function public.notify_invitation_mentor_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://ftgvbgqgvaajpxverlhj.supabase.co/functions/v1/send-invitation-push',
    body := jsonb_build_object('type', 'INSERT', 'table', 'invitation_mentors', 'record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_L9hx2yRabpTNCUZmN2GLZA_A9zO8jvR'
    )
  );
  return new;
end;
$$;

create trigger invitation_mentors_send_push
  after insert on public.invitation_mentors
  for each row execute function public.notify_invitation_mentor_push();
