-- ── invitation_event_rows / invitation_row_responses의 event_row_id FK를
--    on delete cascade에서 해제 ─────────────────────────────────────────
-- 프로그램 유닛(event_row) 삭제 시 이미 발송/처리된 섭외 이력이 함께 사라지지 않도록,
-- event_rows가 삭제되어도 관련 invitation 레코드가 연쇄 삭제되지 않게 한다.
-- (기본 NO ACTION이 되어, 참조 중인 invitation 레코드가 있으면 해당 event_row 삭제가
--  제약조건 위반으로 막힌다.)

alter table public.invitation_event_rows
  drop constraint if exists invitation_event_rows_event_row_id_fkey,
  add constraint invitation_event_rows_event_row_id_fkey
    foreign key (event_row_id) references public.event_rows(id);

alter table public.invitation_row_responses
  drop constraint if exists invitation_row_responses_event_row_id_fkey,
  add constraint invitation_row_responses_event_row_id_fkey
    foreign key (event_row_id) references public.event_rows(id);
