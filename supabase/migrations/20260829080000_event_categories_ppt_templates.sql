-- 행사구분(event_categories)에 교급별(초등/중고등) PPT 양식을 지정할 수 있게 한다.
-- 이 양식은 강사(멘토)가 가입할 때 참고용으로 조회하게 될 자료다.
-- 기존 ppt_templates 라이브러리(occupation_program_unit.ppt_template_id와 동일 패턴)를
-- 그대로 재사용해, 별도 업로드/스토리지 코드 없이 이미 등록된 양식 중에서 고르게 한다.

alter table public.event_categories
  add column if not exists elementary_ppt_template_id uuid references public.ppt_templates(id) on delete set null;

alter table public.event_categories
  add column if not exists secondary_ppt_template_id uuid references public.ppt_templates(id) on delete set null;
