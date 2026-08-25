-- 겸직 셀프 가입 정책을 추가하면서 mentors 테이블의 기존 INSERT 정책을 확인해보니
-- (마이그레이션 이력 없이 대시보드에서 만들어진 것으로 보임), 다음 두 정책이 걸려있었다:
--   - "멘토 가입 허용": with_check = true — 로그인만 했으면 누구든 아무 값으로나 mentors
--     행을 insert할 수 있었다 (id도 자기 자신일 필요조차 없었다).
--   - "멘토 본인 가입": with_check = (id = auth.uid()) — id는 본인으로 제한했지만
--     is_authenticated/score 등 다른 컬럼은 전혀 제한이 없었다.
-- 즉 로그인한 멘토가 직접 REST로 mentors를 insert(자기 자신이든 다른 id든)해서
-- is_authenticated=true로 셀프 승인하거나 score를 마음대로 올릴 수 있는 구멍이었다.
-- (실제로 재현해서 확인함: is_authenticated=true insert가 그대로 성공했다.)
--
-- 정상 가입 경로(auth.users insert 트리거 on_mentor_signup → handle_new_mentor_signup())는
-- SECURITY DEFINER라 RLS를 타지 않으므로 이 INSERT 정책들이 애초에 필요 없었고,
-- admin 저장소의 강사 수동 추가(createMentor 서버 액션)는 "관리자 전체 접근" 정책으로
-- 이미 커버된다. 코드베이스 전체에서 mentors.insert()를 직접 호출하는 곳은 이번에 추가한
-- "본인 mentors 셀프 등록(관리자 겸직)" 정책 하나뿐이었다(grep으로 확인).
-- 그 정책이 is_authenticated=false / score=100 / belongs_to is null로 이미 안전하게
-- 제한하고 있으므로, 기존의 느슨한 두 정책은 대체할 것 없이 제거한다.

drop policy if exists "멘토 가입 허용" on public.mentors;
drop policy if exists "멘토 본인 가입" on public.mentors;
