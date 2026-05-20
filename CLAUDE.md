# Dreampea 프로젝트 claude.md

## 프로젝트 개요
드림피아(Dreampea)는 학교, 진로센터 등 교육기관에 진로 수업을 제공하는 업체의 내부 관리 시스템이다.
강사를 모집하여 기관에 파견하는 비즈니스 모델을 운영하며, 반복 업무를 시스템화하는 것이 목적이다.

---

## 데이터베이스 구조
// =============================================
// Dreampea ERD - dbdiagram.io DBML
// =============================================

// ── 사용자 / 인증 ──────────────────────────

Table admins {
  id            uuid        [pk, default: `gen_random_uuid()`]
  approved_by   uuid        [ref: > admins.id, note: '승인한 슈퍼관리자 id']
  name          varchar     [not null]
  email         varchar     [not null, unique]
  phone         varchar
  is_super          boolean [not null, default: false]
  is_authenticated  boolean [not null, default: false]
  is_sales          boolean [not null, default: false]
  is_comm           boolean [not null, default: false]
  approved_at   timestamp
  created_at    timestamp   [not null, default: `now()`]
}

// 멘토(강사)
Table mentors {
  id          uuid      [pk, default: `gen_random_uuid()`]
  belongs_to        uuid      [ref: > mentors.id, note: '소속 멘토']
  name        varchar   [not null]
  phone       varchar
  email       varchar
  bank_account varchar
  terms_agreed_at   timestamp  [note: 'null이면 미동의']
  terms_version_id  uuid       [ref: > terms.id, note: '동의 시점의 약관 버전']
  id_number   varchar   [note: '주민번호']
  agreement_file_url varchar  [note: '동의서 Supabase Storage URL']
  is_available      boolean   [not null, default: false, note: '강의 가능 여부']
  profile_file_url varchar [note: '프로필 파일 URL (hwp 또는 pdf)']
  score [note: '강사등급을 위한 점수']

  created_at  timestamp [not null, default: `now()`]
}


Table mentor_occupation_programs {
  id                    uuid [pk, default: `gen_random_uuid()`]
  mentor_id             uuid [ref: > mentors.id]
  occupation_program_id uuid [ref: > occupation_programs.id]
  lecture_fee_payer_id  uuid [ref: > mentors.id, note: '강사료 입금자']
  material_fee_payer_id uuid [ref: > mentors.id, note: '재료비 입금자']
  ppt_file_url varchar [note: 'Supabase Storage URL']


  indexes {
    (mentor_id, occupation_program_id) [unique]
  }
}

// ── 기관 ───────────────────────────────────

Table institutions {
  id        uuid      [pk, default: `gen_random_uuid()`]
  region1   varchar   [not null, note: '예: 부산']
  region2   varchar   [note: '예: 해운대구']
  name      varchar   [not null]
  address   varchar
  category  varchar   [note: '유치원/초등/중등/고등/기관/특수학교/문화센터']
  created_at timestamp [not null, default: `now()`]
}

// ── 프로그램 / 직업 ────────────────────────

Table fields {
  id   uuid    [pk, default: `gen_random_uuid()`]
  name varchar [not null, note: '분야 예: 요리, 마술, 공예']
}


// --- 직종
Table occupations {
  id       uuid    [pk, default: `gen_random_uuid()`]
  field_id uuid    [ref: > fields.id]
  name     varchar [not null]
  content  text    
}


enum prep_by {
  "강사"
  "드림피아"
  "모두가능"
}


Table occupation_programs {
  id                     uuid    [pk, default: `gen_random_uuid()`]
  occupation_id          uuid    [ref: > occupations.id]
  name                   varchar [not null, note: '예: 액체함수']
  material_cost_per_person integer [note: '1인당 재료비']
  prep_by                prep_by [note: '강사 or 드림피아 or 모두가능']
  title                   varchar  [not null, note: '프로그램 이름']
  school_request_note     text     [note: '학교요청사항']
  final_product_available text     [note: '완성품제공가능 여부']
  description             text     [note: '프로그램 설명']
  is_delivery_available boolean [not null, default: false, note: '택배 가능 여부']
  created_at            timestamp [not null, default: `now()`]  
}



// ── 준비물 / 재고 ──────────────────────────

Table supplies {
  id                    uuid      [pk, default: `gen_random_uuid()`]
  occupation_program_id uuid      [ref: > occupation_programs.id]
  field                 varchar   [note: '분야 예: 마술사']
  qty_per_person        integer   [not null, default: 1, note: '1인당 수량']
  kit_threshold         integer   [note: '키트재고 경고 기준값']
  max_daily_stock       integer   [note: '일 최대 수용 재고']
  is_consumable boolean [not null, default: false, note: '소모성 여부']
  memo text [note: '메모']
  updated_at            timestamp [not null, default: `now()`]
}


enum stock_type {
  "total"
  "kit"
}

Table supply_logs {
  id         uuid      [pk, default: `gen_random_uuid()`]
  supply_id  uuid      [ref: > supplies.id]
  admin_id   uuid      [ref: > admins.id, note: '처리한 관리자']
  event_id   uuid      [ref: > events.id, note: '행사로 인한 변동이면 연결']
  stock_type stock_type [not null]
  delta      integer   [not null, note: '양수=입고, 음수=출고']
  reason     text      [note: '변동 사유 예: 행사출고, 신규입고, 파손폐기']
  created_at timestamp [not null, default: `now()`]
}


// ── 행사 ───────────────────────────────────

enum inflow_source {
  "팜플렛"
  "기존진행"
  "홈페이지"
  "블로그"
  "전화영업"
  "꿈길"
  "카카오톡채널"
  "MOU"
  "입찰"
  "소개"
}

enum crime_check_method {
  "회보서"
  "동의서"
}

enum student_rotation{
  "1교시마다 변경"
  "2교시마다 변경"
}

enum institution_type {
  "유치원"
  "초등"
  "중등"
  "고등"
  "기관"
}

Table events {
  id                uuid      [pk, default: `gen_random_uuid()`]
  institution_id    uuid      [ref: > institutions.id]
  occupation_program_id        uuid      [ref: > occupation_programs.id]
  sales_admin_id    uuid      [ref: > admins.id, note: '영업담당자']
  comm_admin_id     uuid      [ref: > admins.id, note: '소통담당자']
  name              varchar   [not null]
  requested_dates   date[]    [note: '행사 요청일 배열']
  event_start_at          timestamp [note: '행사 시작 일시']
  event_end_at            timestamp [note: '행사 종료 일시']
  target_grade      varchar   [note: '대상 학년']
  laptop_wifi_note  text
  crime_check_method  crime_check_method [note: '회보서 or 동의서']
  crime_check_info    text    [note: '기관아이디/검증번호']
  crime_check_notified boolean [default: false]
  crime_check_status  varchar
  indoor_shoes_note   text
  parking_note        text
  student_rotation    varchar [note: '1교시마다/2교시마다 변경']
  notice              text
  prep_note           text    [note: '준비사항(드림피아)']
  memo                text
  contact_name        varchar
  contact_email       varchar
  contact_phone       varchar
  inflow_source       inflow_source [note: '유입경로']
  institution_type    institution_type [note: '유치원/초등/중등/고등/기관']
  budget              integer [note: '예산']
  estimate_file_url   varchar [note: '견적서 파일 URL']
  recruit_start_date  date
  comm_content        text    [note: '소통 내용']
  contract_type       varchar
  contract_status     varchar
  supplies_status     varchar [note: '체크전/재고이상무/준비완료 등']
  recruit_status      varchar [note: '섭외대기/섭외진행중/섭외완료']
  recruit_delivered   boolean [default: false, note: '강사섭외 전달 여부']
  school_request_delivered boolean [default: false]
  admin_docs          text    [note: '행정서류']
  admin_docs_delivered boolean [default: false]
  remarks             text    [note: '비고']
  group_chat_status   varchar [note: '개설전/완료']
  payment_confirmed   boolean [default: false]
  photo_sent          boolean [default: false]
  report_sent         boolean [default: false]
  event_check_status smallint [not null, default: 1, note: '행사체크 단계 1~4']
  pre_notice_sent boolean [not null, default: false, note: '사전안내 발송 여부(1주일전)']
  teacher_name        varchar [note: '담당 선생님 성함 예: 3학년 부장 홍길동']
  admin_contact       varchar [note: '계약담당 행정실 연락처']
  instructor_waiting_room varchar [note: '강사대기실 예: 2층 2학년 학년연구실']
  has_elevator        boolean [note: '엘리베이터 유무']
  floor_map_url       varchar [note: '학교 배치도 파일 URL']
  created_at          timestamp [not null, default: `now()`]
  
}

Table event_schedules {
  id         uuid    [pk, default: `gen_random_uuid()`]
  event_id   uuid    [ref: > events.id]
  label      varchar [not null, note: '예: 1교시, 점심시간']
  start_time time    [not null]
  end_time   time    [not null]
  sort_order integer [not null, note: '표시 순서']
}

// 행사 담당자
Table event_admins {
  event_id  uuid [ref: > events.id]
  admin_id  uuid [ref: > admins.id]

  indexes {
    (event_id, admin_id) [pk]
  }
}

// ── 행사 로우데이터 (교시별 수업 단위) ────────

Table event_rows {
  id                    uuid    [pk, default: `gen_random_uuid()`]
  event_id              uuid    [ref: > events.id]
  event_schedule_id     uuid    [ref: > event_schedules.id, note: '교시 참조']
  mentor_id         uuid    [ref: > mentors.id]
  start_time            time    [not null]
  end_time              time    [not null]
  occupation_program_id uuid    [ref: > occupation_programs.id]
  lecture_fee_payer_id  uuid    [ref: > mentors.id, note: '강의료 입금자']
  material_fee_payer_id uuid    [ref: > mentors.id, note: '재료비 입금자']
  event_date            date    [not null]
  target_grade          varchar
  classroom             varchar [note: '강의실 예: 1-1반']
  instructor_waiting_room varchar [note: '강사대기실 예: 2층 2학년 학년연구실']
  attendance            boolean [default: false]
  lecture_fee           integer
  lecture_fee_after_tax integer [note: '세후 강의료']
  headcount             integer [note: '인원수']
  session_headcount     integer [note: '차시별 인원수']
  material_fee          integer [note: '재료비']
  remarks               text
  school_request_response text [note: '학교 요청사항 답변']

}

// ── 행사 사진 ──────────────────────────────

Table event_photos {
  id         uuid      [pk, default: `gen_random_uuid()`]
  event_id   uuid      [ref: > events.id]
  url        varchar   [not null]
  created_at timestamp [not null, default: `now()`]
}

// ── 관리 / 운영 ────────────────────────────

enum task_type {
  "강사섭외"
  "준비물준비"
  "견적서제작"
}

Table tasks {
  id         uuid      [pk, default: `gen_random_uuid()`]
  admin_id   uuid      [ref: > admins.id]
  event_id   uuid      [ref: > events.id]
  task_type  task_type [not null]
  is_done    boolean   [not null, default: false]
  created_at timestamp [not null, default: `now()`]
}

enum request_type{
  "멘토가입요청"
  "회원정보수정요청"
}

Table mentor_requests {
  id           uuid      [pk, default: `gen_random_uuid()`]
  instructor_id uuid     [ref: > mentors.id]
  request_type  request_type   [not null]
  requested_at timestamp [not null, default: `now()`]
}

// ── 콘텐츠 ────────────────────────────────

// 공지사항
Table announcements {
  id         uuid      [pk, default: `gen_random_uuid()`]
  title      varchar   [not null]
  content    text      [not null]
  created_at timestamp [not null, default: `now()`]
}

// 배너
Table banners {
  id            uuid      [pk, default: `gen_random_uuid()`]
  display_order integer   [not null, note: '표시 순서']
  link_url      varchar
  image_url  varchar  [note: 'Supabase Storage URL']
  created_at    timestamp [not null, default: `now()`]
}

// 이용약관
Table terms {
  id             uuid      [pk, default: `gen_random_uuid()`]
  service_terms  text      [not null]
  privacy_policy text      [not null]
  effective_at   timestamp [not null]
}

// 회사소개
Table company_info {
  id           uuid      [pk, default: `gen_random_uuid()`]
  content_html text      [not null]
  updated_at   timestamp [not null, default: `now()`]
}


## 기술 스택

| 항목 | 기술 |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| DB 클라이언트 | Supabase Client (`@supabase/supabase-js`) 주력 |
| 스타일링 | Tailwind CSS |
| 폼 관리 | React Hook Form |
| 유효성 검사 | Zod |
| 상태 관리 | Zustand |
| 테이블 | TanStack Table |
| 배포 | Vercel |

---

## 프로젝트 구조

```
/app                  # Next.js App Router 페이지
/components
  /ui                 # 버튼, 인풋 등 공통 컴포넌트
  /features           # 도메인별 컴포넌트 (행사관리, 강사관리 등)
/lib                  # 유틸 함수, Supabase 클라이언트 초기화 등
/types                # TypeScript 타입 정의
/hooks                # 커스텀 훅
/constants            # enum 값, 상수 등
```

---

## Supabase 설정

- Supabase Client를 주력으로 사용한다.
- `/lib/supabase.ts`에서 클라이언트를 초기화하고 전역에서 import하여 사용한다.
- 관리자 웹과 강사 웹이 동일한 Supabase 프로젝트를 공유한다.
- RLS(Row Level Security) 정책은 두 웹의 접근 권한을 모두 고려하여 설계한다.
- 환경변수는 아래 형식을 따른다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

---

## 인증 및 권한

### 로그인 주체
- **관리자(admins)** — 현재 웹(관리자 웹)에서 로그인
- **멘토(mentors)** — 별도 강사 웹에서 회원가입 및 로그인 (현재 웹에서는 관리자가 관리만 함)

### 관리자 역할 (admins 테이블)
| 컬럼 | 설명 |
|---|---|
| `is_super` | 슈퍼관리자. 다른 관리자 승인 권한 보유 |
| `is_authenticated` | 승인된 관리자 여부. `is_super`인 관리자만 변경 가능 |
| `is_sales` | 영업담당자 여부 |
| `is_comm` | 소통담당자 여부 |

- 역할은 동시에 보유 가능하다.
- `is_authenticated`가 `false`인 관리자는 로그인 후 접근이 제한된다.
- `is_authenticated` 승인은 `is_super = true`인 관리자만 가능하다.

### 멘토 정보 수정
- 멘토는 직접 정보를 수정할 수 없다.
- 멘토가 수정 요청(`mentor_requests`)을 제출하면 관리자가 처리한다.

---

## 비즈니스 로직 핵심 규칙

### 재고 차감
- `event_rows`에 row가 생성되고 `session_headcount` 값이 입력되면 재고가 차감된다.
- 재고는 `supply_logs` 테이블에 로그를 남기는 방식으로 관리한다.
- 재고 종류는 `total`(총재고)과 `kit`(키트재고) 두 가지이며, `free`(여유재고)는 `total - kit`으로 계산한다.
- `delta` 값은 양수=입고, 음수=출고를 의미한다.
- 소모성(`is_consumable = true`) 재료만 차감 처리한다.

### 행사 체크 상태 (event_check_status)
- `smallint` 타입으로 1~4 값만 허용한다.
- 각 단계의 의미는 추후 확정 예정이다.

### 강사료/재료비 입금자
- 기본값은 `mentor_occupation_programs` 테이블의 `lecture_fee_payer_id`, `material_fee_payer_id`에서 가져온다.
- `event_rows`에 값이 있으면 오버라이드한다. 없으면(`null`) 기본값을 사용한다.

### 여유재고 계산
```
여유재고(free) = 총재고(total) - 키트재고(kit)
```

---

## 코딩 컨벤션

### 네이밍
- 컴포넌트 — PascalCase (`EventTable.tsx`)
- 함수/변수 — camelCase (`fetchEvents`)
- 타입/인터페이스 — PascalCase (`EventRow`)
- 상수 — UPPER_SNAKE_CASE (`MAX_STOCK`)
- DB 컬럼명 — snake_case (Supabase 기본)

### 컴포넌트
- 함수형 컴포넌트만 사용한다.
- `export default`는 페이지 컴포넌트에만 사용하고, 나머지는 named export를 사용한다.

### 폼
- 모든 폼은 React Hook Form + Zod 조합으로 작성한다.
- Zod 스키마는 `/lib/validations/` 디렉토리에 도메인별로 분리하여 관리한다.

### 타입
- Supabase 테이블 타입은 Supabase CLI로 자동 생성하여 `/types/supabase.ts`에서 관리한다.
- 추가 커스텀 타입은 `/types/` 디렉토리에 도메인별로 분리한다.

### 상태관리
- 서버 데이터(DB 조회)는 Supabase Client로 직접 패치한다.
- 전역 클라이언트 상태(로그인 정보, UI 상태 등)는 Zustand로 관리한다.
- Zustand 스토어는 `/lib/store/` 디렉토리에 도메인별로 분리한다.

### 주석
- 주석은 한글로 작성한다.

### 커밋 메시지
- 커밋 메시지는 한글로 작성한다.

---

## 주요 테이블 관계 요약

```
fields → occupations → occupation_programs
                              ↓
institutions → events → event_rows ← mentors
                  ↓
           event_schedules (교시별 시간표)
                              ↓
                        supply_logs ← supplies
```

---

## 미결 사항 (확정 시 업데이트 필요)

- `event_check_status` 1~4 단계별 의미 정의
- 도메인 확정 후 Vercel 환경변수 업데이트
