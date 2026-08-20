-- PPT 양식을 유닛마다 새로 업로드하게 하면(20260819000000) 같은 파일이 여러 유닛에 중복
-- 업로드되는 문제가 있다. 실제로는 양식 종류가 4개(교급 2 x 프로그램 성격 2)뿐이라, 양식을
-- 미리 등록해두는 작은 라이브러리 테이블을 만들고 유닛은 그중 하나를 고르게 한다.

create table if not exists public.ppt_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.ppt_templates enable row level security;

drop policy if exists "ppt_templates_select" on public.ppt_templates;
create policy "ppt_templates_select" on public.ppt_templates
  for select using (public.is_authenticated_admin_or_mentor());
drop policy if exists "ppt_templates_write" on public.ppt_templates;
create policy "ppt_templates_write" on public.ppt_templates
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

alter table public.occupation_program_unit
  add column if not exists ppt_template_id uuid references public.ppt_templates (id) on delete set null;

alter table public.occupation_program_unit
  drop column if exists ppt_template_url;
