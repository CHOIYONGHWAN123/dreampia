-- 멘토 고유코드를 순번 기반(00001, 00002...)에서 영문+숫자 랜덤 5자리로 변경.
--
-- 순번 코드는 오탈자 하나만으로도 다른 실존 멘토의 코드가 되어버리기 쉬워
-- (예: 00004 입력하려다 00003 입력) 소속 멘토를 잘못 지정할 위험이 있었다.
-- 랜덤 코드는 인접한 값이 실존 코드일 확률이 훨씬 낮아 이 위험을 줄인다.
-- 헷갈리기 쉬운 문자(0/O, 1/I/L)는 제외하고 항상 대문자로 발급/조회한다.

create or replace function public.generate_mentor_unique_code()
returns varchar
language plpgsql
as $$
declare
  v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_code varchar;
begin
  loop
    select string_agg(substr(v_chars, (floor(random() * length(v_chars)) + 1)::int, 1), '')
      into v_code
      from generate_series(1, 5);
    exit when not exists (select 1 from public.mentors where mentor_unique_code = v_code);
  end loop;
  return v_code;
end;
$$;

create or replace function public.mentors_assign_unique_code()
returns trigger
language plpgsql
as $$
begin
  if new.mentor_unique_code is null or new.mentor_unique_code = '' then
    new.mentor_unique_code := public.generate_mentor_unique_code();
  end if;
  return new;
end;
$$;

drop trigger if exists mentors_assign_unique_code on public.mentors;
create trigger mentors_assign_unique_code
  before insert on public.mentors
  for each row
  execute function public.mentors_assign_unique_code();

-- 시퀀스 기반 default 제거 (이제 트리거가 발급을 담당한다)
alter table public.mentors alter column mentor_unique_code drop default;
drop sequence if exists public.mentor_unique_code_seq;

-- 기존 행도 랜덤 코드로 재발급. 한 트랜잭션 내에서 행마다 개별 UPDATE로 실행해야
-- generate_mentor_unique_code()의 중복 체크가 방금 재발급된 다른 행의 코드까지 볼 수 있다
-- (하나의 UPDATE 문으로 일괄 처리하면 문장 시작 시점 스냅샷이라 서로의 새 코드를 못 본다).
do $$
declare
  r record;
begin
  for r in select id from public.mentors loop
    update public.mentors
      set mentor_unique_code = public.generate_mentor_unique_code()
      where id = r.id;
  end loop;
end;
$$;

-- 코드 조회 시 대소문자 구분 없이 매칭
create or replace function public.find_mentor_by_unique_code(p_code text)
returns table (id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.name
  from public.mentors m
  where m.mentor_unique_code = upper(trim(p_code))
  limit 1;
$$;
