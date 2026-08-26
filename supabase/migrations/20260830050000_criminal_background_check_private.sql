-- 회보서(criminal_background_check)는 개인 민감정보이므로 공개 버킷 대신
-- private 버킷 + signed URL 방식으로 전환한다.
--
-- RLS 정책은 그대로 둔다 — 20260721010000(멘토 본인 event_row 폴더)과
-- 20260830040000(관리자)에서 만든 정책이 모두 "for all"이라 select(조회)도
-- 이미 포함하고 있으므로, 조회 시 signed URL 발급에 필요한 권한은 이미 갖춰져 있다.
update storage.buckets set public = false where id = 'criminal-background-check';
