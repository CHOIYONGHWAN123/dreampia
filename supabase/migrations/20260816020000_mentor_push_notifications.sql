-- 강사 섭외 초대 푸시 알림 기능: 멘토별 Expo 푸시 토큰 저장 테이블과, 발송 로그 테이블.
-- 실제 발송은 invitation_mentors 테이블에 대한 Database Webhook(대시보드에서 수동 생성,
-- 시크릿을 마이그레이션 파일에 남기지 않기 위해 SQL로는 만들지 않음) → Edge Function
-- (send-invitation-push)에서 처리한다.

create table public.mentor_devices (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expo_push_token)
);

alter table public.mentor_devices enable row level security;

create policy "mentor_devices_self_all" on public.mentor_devices
  for all to authenticated
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

-- 발송 로그: 감사/재시도용. 멘토 앱에서 직접 읽거나 쓰지 않고 서버(Edge Function, service-role)만
-- 접근하므로 RLS는 켜두되 정책을 만들지 않아 클라이언트 접근을 전면 차단한다.
create table public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references public.mentors(id) on delete set null,
  invitation_mentor_id uuid references public.invitation_mentors(id) on delete set null,
  title text,
  body text,
  data jsonb,
  expo_ticket jsonb,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now()
);

alter table public.push_notifications enable row level security;
