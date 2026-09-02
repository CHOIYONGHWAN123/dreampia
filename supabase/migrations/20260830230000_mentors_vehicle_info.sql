-- 멘토 앱 "회원정보 수정" 화면에 차량 정보 입력란 추가.
-- 차량보유여부는 미입력 상태를 구분해야 앱에서 필수입력 검증이 가능하므로 nullable로 둔다
-- (default false로 두면 "아직 선택 안 함"과 "미보유(X)"를 구분할 수 없다).
-- 차량정보는 차량보유여부가 O일 때만 의미가 있는 자유 텍스트(차종/색깔/차량번호)라 별도 정규화 없이 text로 둔다.

alter table public.mentors
  add column if not exists has_vehicle boolean,
  add column if not exists vehicle_info text;

comment on column public.mentors.has_vehicle is '차량보유여부 (true=보유, false=미보유, null=미입력)';
comment on column public.mentors.vehicle_info is '차량정보 (차종/색깔/차량번호). has_vehicle=true일 때만 입력';
