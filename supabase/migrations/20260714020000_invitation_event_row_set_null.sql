-- ── 프로그램 유닛(event_row) 삭제 시 섭외 이력은 유지 ──────────────────
-- event_row_id를 nullable로 바꾸고 on delete set null로 전환하여,
-- event_row가 삭제되어도 invitation_event_rows / invitation_row_responses
-- 레코드 자체는 삭제되지 않고 event_row_id만 null로 남도록 한다.

-- invitation_event_rows: event_row_id가 복합 PK에 포함되어 있어 nullable로 바꿀 수 없으므로
-- 대리키(id)로 PK를 교체하고, (invitation_id, event_row_id)는 일반 unique 제약으로 유지한다.
alter table public.invitation_event_rows
  add column if not exists id uuid default gen_random_uuid();

update public.invitation_event_rows set id = gen_random_uuid() where id is null;

alter table public.invitation_event_rows
  alter column id set not null;

alter table public.invitation_event_rows
  drop constraint if exists invitation_event_rows_pkey;

alter table public.invitation_event_rows
  add constraint invitation_event_rows_pkey primary key (id);

alter table public.invitation_event_rows
  add constraint invitation_event_rows_invitation_id_event_row_id_key
    unique (invitation_id, event_row_id);

alter table public.invitation_event_rows
  alter column event_row_id drop not null;

alter table public.invitation_event_rows
  drop constraint if exists invitation_event_rows_event_row_id_fkey;

alter table public.invitation_event_rows
  add constraint invitation_event_rows_event_row_id_fkey
    foreign key (event_row_id) references public.event_rows(id) on delete set null;

-- invitation_row_responses: 이미 대리키(id)가 PK이므로 컬럼만 nullable로 전환
alter table public.invitation_row_responses
  alter column event_row_id drop not null;

alter table public.invitation_row_responses
  drop constraint if exists invitation_row_responses_event_row_id_fkey;

alter table public.invitation_row_responses
  add constraint invitation_row_responses_event_row_id_fkey
    foreign key (event_row_id) references public.event_rows(id) on delete set null;
