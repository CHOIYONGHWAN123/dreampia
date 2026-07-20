// 멘토 앱 "아이디(이메일) 찾기" 기능.
//
// mentors.id == auth.uid() 규칙과 이름+전화번호를 이용해, 로그인 전 사용자가
// 본인 계정에 등록된 이메일로 인증번호를 받고, 검증에 성공하면 마스킹된
// 이메일을 돌려받는다. GoTrue의 OTP 발송/검증은 HTTP Auth API라 Postgres RPC로는
// 호출할 수 없어 Edge Function으로 구현한다.
//
// 두 액션(request/verify) 사이에 별도 세션을 저장하지 않는다 — 매번 이름+전화번호로
// mentors를 다시 찾아 이메일을 재도출한다. 존재 여부를 숨기기 위해 request는
// 매치 여부와 무관하게 항상 같은 응답을 반환한다.

import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GENERIC_REQUEST_MESSAGE =
  "입력하신 정보와 일치하는 계정이 있다면 인증번호가 발송됩니다.";
const GENERIC_VERIFY_ERROR = "인증번호가 일치하지 않거나 만료되었습니다.";
const RATE_LIMIT_ERROR = "잠시 후 다시 시도해주세요.";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// supabase-js의 functions.invoke()는 2xx가 아니면 body를 파싱해주지 않고 불투명한
// FunctionsHttpError로 감싸버린다. 클라이언트에서 우리가 만든 한글 메시지를 그대로
// 쓰려면 검증 실패/레이트리밋 등 "처리된" 실패도 전부 200으로 내려주고 ok 필드로 구분한다.
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  const maskedLen = Math.max(local.length - visible.length, 1);
  return `${visible}${"*".repeat(maskedLen)}@${domain}`;
}

async function checkRateLimit(
  phoneDigits: string,
  action: "request" | "verify",
  windowMs: number,
  limit: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabaseAdmin
    .from("mentor_find_id_attempts")
    .select("id", { count: "exact", head: true })
    .eq("phone_digits", phoneDigits)
    .eq("action", action)
    .gte("created_at", since);
  if (error) {
    console.error("rate limit check failed", error);
    return true; // 레이트리밋 조회 실패로 정상 사용자를 막지 않는다.
  }
  return (count ?? 0) < limit;
}

async function recordAttempt(phoneDigits: string, action: "request" | "verify") {
  const { error } = await supabaseAdmin
    .from("mentor_find_id_attempts")
    .insert({ phone_digits: phoneDigits, action });
  if (error) console.error("failed to record attempt", error);
}

async function findMentorEmail(name: string, phoneDigits: string): Promise<string | null> {
  const { data: mentors, error } = await supabaseAdmin
    .from("mentors")
    .select("id, phone")
    .eq("name", name.trim());
  if (error) {
    console.error("mentor lookup failed", error);
    return null;
  }

  const match = (mentors ?? []).find(
    (m) => m.phone && normalizePhone(m.phone) === phoneDigits
  );
  if (!match) return null;

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
    match.id
  );
  if (userError || !userData?.user?.email) {
    console.error("auth user lookup failed", userError);
    return null;
  }
  return userData.user.email;
}

async function handleRequest(name: string, phoneDigits: string) {
  const allowed = await checkRateLimit(phoneDigits, "request", 60 * 60 * 1000, 5);
  if (!allowed) return jsonResponse({ ok: false, error: RATE_LIMIT_ERROR });

  await recordAttempt(phoneDigits, "request");

  const email = await findMentorEmail(name, phoneDigits);
  if (email) {
    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) console.error("signInWithOtp failed", error);
  }

  // 매치 여부와 무관하게 동일한 응답 (계정 존재 여부 열거 방지)
  return jsonResponse({ ok: true, message: GENERIC_REQUEST_MESSAGE });
}

async function handleVerify(name: string, phoneDigits: string, code: string) {
  const allowed = await checkRateLimit(phoneDigits, "verify", 15 * 60 * 1000, 5);
  if (!allowed) return jsonResponse({ ok: false, error: RATE_LIMIT_ERROR });

  await recordAttempt(phoneDigits, "verify");

  if (!/^\d{4,10}$/.test(code)) {
    return jsonResponse({ ok: false, error: GENERIC_VERIFY_ERROR });
  }

  const email = await findMentorEmail(name, phoneDigits);
  if (!email) return jsonResponse({ ok: false, error: GENERIC_VERIFY_ERROR });

  const { error } = await supabaseAdmin.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (error) return jsonResponse({ ok: false, error: GENERIC_VERIFY_ERROR });

  return jsonResponse({ ok: true, email: maskEmail(email) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "허용되지 않은 요청입니다." });
  }

  let body: { action?: string; name?: string; phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "잘못된 요청입니다." });
  }

  const { action, name, phone, code } = body;
  if (!name?.trim() || !phone?.trim()) {
    return jsonResponse({ ok: false, error: "이름과 전화번호를 입력해주세요." });
  }
  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits) {
    return jsonResponse({ ok: false, error: "전화번호를 확인해주세요." });
  }

  if (action === "request") {
    return handleRequest(name, phoneDigits);
  }
  if (action === "verify") {
    if (!code?.trim()) {
      return jsonResponse({ ok: false, error: "인증번호를 입력해주세요." });
    }
    return handleVerify(name, phoneDigits, code.trim());
  }
  return jsonResponse({ ok: false, error: "잘못된 요청입니다." });
});
