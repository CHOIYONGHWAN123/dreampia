-- work_logs.event_id는 감사 로그(audit log) 성격이므로, 행사가 삭제되어도
-- 로그 자체는 남기고 event_id만 null로 비운다. 기존 제약(ON DELETE 미지정 = NO ACTION)은
-- work_logs가 있는 행사를 삭제할 수 없게 막아버리는 문제가 있었다.
alter table public.work_logs drop constraint work_logs_event_id_fkey;
alter table public.work_logs
  add constraint work_logs_event_id_fkey foreign key (event_id) references public.events(id) on delete set null;
