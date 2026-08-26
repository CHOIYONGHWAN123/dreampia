-- 공지사항(events.notice) 첨부 이미지 테이블. 공지사항은 텍스트 하나지만 첨부파일은
-- 여러 장 업로드할 수 있어야 하므로 별도 테이블로 관리한다.
create table if not exists public.event_notice_files (
  id         uuid      primary key default gen_random_uuid(),
  event_id   uuid      not null references public.events(id) on delete cascade,
  url        varchar   not null,
  created_at timestamp not null default now()
);

create index if not exists event_notice_files_event_id_idx
  on public.event_notice_files(event_id);

alter table public.event_notice_files enable row level security;

-- 관리자는 전체 CRUD 가능 (행사 등록/수정 화면에서 관리자가 직접 업로드)
drop policy if exists "event_notice_files_admin_write" on public.event_notice_files;
create policy "event_notice_files_admin_write" on public.event_notice_files
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- 배정된 강사(및 소속대표)는 공지사항(notice)과 함께 첨부파일도 조회 가능해야 하므로
-- event_photos_owner_select와 동일한 패턴으로 조회만 허용한다.
drop policy if exists "event_notice_files_mentor_select" on public.event_notice_files;
create policy "event_notice_files_mentor_select" on public.event_notice_files
  for select using (
    exists (
      select 1 from public.event_rows er
      where er.event_id = event_notice_files.event_id and er.mentor_id = auth.uid()
    )
    or exists (
      select 1 from public.event_rows er
      join public.mentors m on m.id = er.mentor_id
      where er.event_id = event_notice_files.event_id and m.belongs_to = auth.uid()
    )
  );
