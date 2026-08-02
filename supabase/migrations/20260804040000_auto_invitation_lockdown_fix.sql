-- 20260804030000에서 PUBLIC만 revoke했는데, 이 프로젝트는 public 스키마 함수 생성 시
-- anon/authenticated에 default privileges로 EXECUTE가 자동 부여되어 있어 그것만으로는
-- 부족했다(개별 role grant가 남아 있었음). anon/authenticated에서도 명시적으로 회수한다.

revoke execute on function public.find_next_auto_candidate(uuid) from anon, authenticated;
revoke execute on function public.advance_auto_invitation(uuid) from anon, authenticated;
