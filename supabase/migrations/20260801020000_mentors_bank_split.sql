-- mentors.bank_account에 "은행명 계좌번호" 형태로 섞여 들어가던 값을
-- bank(은행명) / bank_account(계좌번호)로 분리한다.
-- 기존 값은 전부 "은행명 계좌번호" 형태(공백 1칸 구분)라 안전하게 자동 백필 가능.

alter table public.mentors add column bank varchar;

update public.mentors
set
  bank = case when position(' ' in bank_account) > 0 then split_part(bank_account, ' ', 1) else null end,
  bank_account = case
    when position(' ' in bank_account) > 0
      then trim(substring(bank_account from position(' ' in bank_account) + 1))
    else bank_account
  end
where bank_account is not null;
