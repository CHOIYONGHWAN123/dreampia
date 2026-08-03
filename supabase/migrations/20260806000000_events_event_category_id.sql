-- 행사(events)에 행사구분(event_categories)을 직접 연결한다.
-- 지금까지는 "프로그램 추가" 단계에서 유닛을 고를 때마다 행사구분을 매번 선택했는데,
-- 한 행사는 보통 행사구분이 하나로 고정되므로 행사 등록 시 한 번만 선택하고
-- 프로그램 유닛 선택은 그 값으로 자동 필터링하도록 바꾼다.

alter table public.events
  add column event_category_id uuid references public.event_categories(id);
