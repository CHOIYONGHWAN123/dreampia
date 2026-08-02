-- 강사 섭외 자동화(점수 기반 순차 초대)를 위해 mentors.score를 not null로 만든다.
-- score가 null이면 순위를 매길 수 없으므로, 기존 null 값은 만점(100)으로 채운다.
--
-- score는 mentors_protect_admin_only_columns 트리거가 관리자 세션이 아니면 되돌리는
-- 보호 컬럼이라, 마이그레이션 연결(관리자 세션 아님)로 그냥 update하면 트리거가 조용히
-- 되돌려버린다. 백필하는 동안만 트리거를 잠시 꺼둔다.

alter table public.mentors disable trigger mentors_protect_admin_only_columns;
update public.mentors set score = 100 where score is null;
alter table public.mentors enable trigger mentors_protect_admin_only_columns;

alter table public.mentors
  alter column score set default 100,
  alter column score set not null;
