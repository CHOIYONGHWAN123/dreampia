-- 멘토 앱 profile-setup(가입 중, 아직 승인 전) 화면에서 프로그램의 분야 기본 PPT 양식을
-- 참고용으로 보여주려 했는데, event_categories/ppt_templates의 SELECT 정책이
-- is_authenticated_admin_or_mentor()(= mentors.is_authenticated = true, 즉 승인된
-- 멘토만)로 걸려 있어 가입 중인 신규 멘토는 이 두 테이블을 읽지 못했다.
-- field_event_categories는 이미 "승인 대기 중인 멘토도 카탈로그는 볼 수 있어야 하므로"
-- (20260822000000) 라는 이유로 `to authenticated using (true)` 정책을 추가해뒀는데,
-- 정작 실제 양식 URL이 들어있는 event_categories/ppt_templates에는 빠져 있었다.
-- 동일한 이유로 같은 패턴을 추가한다.

drop policy if exists "event_categories_select_authenticated" on public.event_categories;
create policy "event_categories_select_authenticated" on public.event_categories
  for select to authenticated using (true);

drop policy if exists "ppt_templates_select_authenticated" on public.ppt_templates;
create policy "ppt_templates_select_authenticated" on public.ppt_templates
  for select to authenticated using (true);
