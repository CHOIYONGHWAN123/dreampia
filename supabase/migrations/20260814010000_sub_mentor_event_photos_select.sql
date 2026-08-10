-- 멘토 앱 "강의 일정 상세" 화면에서 소속대표가 소속강사의 event_rows는
-- get_sub_mentor_event_row_detail()로 볼 수 있게 됐지만(20260814000000),
-- event_photos는 별도 테이블이라 여전히 본인/관리자만 조회 가능했다.
-- event_photos에는 event_rows_id/url/created_at만 있어 민감정보가 없으므로
-- (mentors처럼 RLS를 넓히기 부담스러운 테이블이 아니므로) additive select 정책으로
-- 소속대표가 소속강사의 사진도 조회할 수 있게 한다.

drop policy if exists "event_photos_owner_select" on public.event_photos;
create policy "event_photos_owner_select" on public.event_photos
  for select using (
    exists (
      select 1 from public.event_rows er
      join public.mentors m on m.id = er.mentor_id
      where er.id = event_photos.event_rows_id and m.belongs_to = auth.uid()
    )
  );
