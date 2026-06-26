-- events 테이블에 campaign_id 컬럼 추가 (CLAUDE.md ERD 반영)
-- '행사 구분' 선택을 occupation_programs가 아닌 campaign 테이블 기준으로 변경하기 위함

alter table public.events
  add column campaign_id uuid references public.campaign(id);
