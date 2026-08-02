-- find_next_auto_candidate/advance_auto_invitation은 decline_invitation/
-- expire_stale_invitations/create_auto_invitation 내부에서만 호출되어야 하는
-- 헬퍼 함수인데, Postgres는 함수 생성 시 기본적으로 PUBLIC(=anon, authenticated 포함)에
-- EXECUTE 권한을 준다. 이대로 두면 멘토가 직접 advance_auto_invitation()을 호출해
-- 정상적인 거절/만료 없이 다음 후보로 강제로 넘길 수 있다.
--
-- SECURITY DEFINER 함수 안에서의 호출은 함수 소유자 권한으로 실행되므로, 아래처럼
-- 권한을 회수해도 decline_invitation 등 내부 호출 경로는 그대로 동작한다.
--
-- 이 프로젝트는 public 스키마에 함수를 만들면 anon/authenticated에 자동으로 EXECUTE가
-- 부여되도록 default privileges가 걸려 있어서(PostgREST 노출용), PUBLIC 권한만
-- revoke해서는 부족하고 anon/authenticated에서 개별로도 회수해야 한다.

revoke execute on function public.find_next_auto_candidate(uuid) from public, anon, authenticated;
revoke execute on function public.advance_auto_invitation(uuid) from public, anon, authenticated;
