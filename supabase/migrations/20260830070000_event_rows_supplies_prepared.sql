-- 프로그램별 준비주체(occupation_programs.prep_by)와 별개로, 실제로 이 회차(event_row)의
-- 준비물이 준비되었는지 체크하기 위한 컬럼. 관리자가 행사 등록/수정 화면에서 직접 체크한다.
alter table public.event_rows
  add column supplies_prepared boolean not null default false;

-- event_rows는 기존 RLS 정책(is_authenticated_admin_or_mentor 등)이 테이블 단위로 적용되므로
-- 컬럼 추가만으로는 정책 변경이 필요 없다.
