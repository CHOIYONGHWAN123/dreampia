-- program_categories(school_level + event_category_id 조합 테이블) 제거.
-- event_category_id는 이미 fields 단계에서 1:1로 관리되고 있어 program_categories에서
-- 다시 들고 있는 게 중복이었다. school_level만 occupation_program_unit에 직접 추가해서
-- 프로그램 유닛이 스스로 교급을 갖도록 단순화한다.

alter table public.occupation_program_unit
  add column school_level public.school_level;

update public.occupation_program_unit opu
set school_level = pc.school_level
from public.program_categories pc
where pc.id = opu.program_category_id;

-- mentor_invitation_requests 뷰가 program_categories를 거쳐 event_categories.name을
-- experience_type으로 노출하고 있어, program_categories 없이도 fields 체인을 타고
-- 같은 값을 얻도록 먼저 재생성한다.
drop view public.mentor_invitation_requests;

create view public.mentor_invitation_requests
with (security_invoker = true) as
select
  im.id as invitation_mentor_id,
  im.mentor_id,
  im.status as mentor_status,
  im.responded_at,
  i.id as invitation_id,
  i.is_all_approval_required,
  i.status as invitation_status,
  i.expires_at,
  er.id as event_row_id,
  er.start_time,
  er.end_time,
  er.target,
  er.classroom,
  er.headcount,
  er.session_headcount,
  er.lecture_fee,
  er.lecture_fee_after_tax,
  e.id as event_id,
  e.name as event_name,
  ins.name as institution_name,
  ins.address as institution_address,
  opu.id as unit_id,
  opu.title as unit_title,
  op.name as program_name,
  o.name as occupation_name,
  ec.name as experience_type,
  er.mentor_id as assigned_mentor_id
from public.invitation_mentors im
join public.invitations i on i.id = im.invitation_id
join public.invitation_event_rows ier on ier.invitation_id = i.id
join public.event_rows er on er.id = ier.event_row_id
join public.events e on e.id = er.event_id
left join public.institutions ins on ins.id = e.institution_id
left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
left join public.occupation_programs op on op.id = opu.occupation_programs_id
left join public.occupations o on o.id = op.occupation_id
left join public.fields f on f.id = o.field_id
left join public.event_categories ec on ec.id = f.event_category_id;

grant select on public.mentor_invitation_requests to authenticated;

alter table public.occupation_program_unit drop column program_category_id;
drop table public.program_categories;
