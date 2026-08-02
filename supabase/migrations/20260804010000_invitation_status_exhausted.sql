-- 자동 섭외(점수 순차 초대)에서 더 이상 초대할 후보가 없을 때 쓸 상태값.
-- ALTER TYPE ... ADD VALUE는 같은 트랜잭션 내에서 바로 사용할 수 없어 별도 마이그레이션으로 분리한다.

alter type public.invitation_status add value if not exists '후보소진';
