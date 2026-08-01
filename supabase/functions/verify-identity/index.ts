// 멘토 앱 회원가입 "본인인증" 기능.
//
// 클라이언트(WebView)에서 PortOne 브라우저 SDK(PortOne.requestIdentityVerification)로
// PASS/카카오 등 본인인증을 마치고 나면 identityVerificationId만 돌려받는다. 이 값을
// 그대로 신뢰하면 클라이언트가 아무 문자열이나 보내 인증을 위조할 수 있으므로, 반드시
// 서버(여기)에서 PortOne REST API를 비밀키로 다시 조회해 실제로 VERIFIED 상태인지
// 확인한 뒤 이름/전화번호/CI를 반환한다.
//
// PortOne 계정이 아직 없어(가입/심사 전) PORTONE_API_SECRET이 비어있는 상태로 배포해둔다.
// 나중에 `supabase secrets set PORTONE_API_SECRET=...`으로 채워 넣으면 바로 동작한다.
//
// CI(연계정보)는 실제 인물을 식별하는 값이라, 같은 사람이 이메일만 바꿔 재가입하는 것을
// 여기서 mentors.identity_verification_ci로 사전에 걸러준다(동시 요청 대비 DB 유니크
// 인덱스도 별도로 있음).

import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PORTONE_API_SECRET = Deno.env.get("PORTONE_API_SECRET");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// mentor-find-id와 동일한 이유: functions.invoke()가 2xx가 아니면 body를 파싱하지 않고
// 불투명한 에러로 감싸버리므로, 처리된 실패도 전부 200 + ok 필드로 내려준다.
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

type PortOneIdentityVerification = {
  status?: "READY" | "VERIFIED" | "FAILED";
  verifiedCustomer?: {
    name?: string;
    phoneNumber?: string;
    // PortOne 응답의 CI 필드명은 실제 계정 연동 후 응답으로 최종 확인이 필요하다.
    // (문서 발췌본에서 name/phoneNumber/operator는 확인했지만 ci는 확인하지 못했다.)
    ci?: string;
  };
};

async function fetchPortOneVerification(
  identityVerificationId: string
): Promise<PortOneIdentityVerification | null> {
  const res = await fetch(
    `https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
    { headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` } }
  );
  if (!res.ok) {
    console.error("PortOne API error", res.status, await res.text());
    return null;
  }
  return await res.json();
}

async function findMentorByCi(ci: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("mentors")
    .select("id")
    .eq("identity_verification_ci", ci)
    .limit(1);
  if (error) {
    console.error("mentor CI lookup failed", error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "허용되지 않은 요청입니다." });
  }
  if (!PORTONE_API_SECRET) {
    console.error("PORTONE_API_SECRET is not configured");
    return jsonResponse({ ok: false, error: "본인인증이 아직 준비되지 않았습니다." });
  }

  let body: { identityVerificationId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "잘못된 요청입니다." });
  }

  const identityVerificationId = body.identityVerificationId?.trim();
  if (!identityVerificationId) {
    return jsonResponse({ ok: false, error: "인증 정보가 없습니다." });
  }

  const verification = await fetchPortOneVerification(identityVerificationId);
  if (!verification || verification.status !== "VERIFIED") {
    return jsonResponse({ ok: false, error: "본인인증에 실패했습니다. 다시 시도해주세요." });
  }

  const { name, phoneNumber, ci } = verification.verifiedCustomer ?? {};
  if (!name || !phoneNumber) {
    console.error("verified but missing customer fields", verification);
    return jsonResponse({ ok: false, error: "본인인증 결과를 확인할 수 없습니다." });
  }

  if (ci && (await findMentorByCi(ci))) {
    return jsonResponse({
      ok: false,
      error: "이미 가입된 계정이 있습니다. 아이디 찾기를 이용해주세요.",
    });
  }

  return jsonResponse({ ok: true, name, phone: phoneNumber, ci: ci ?? null });
});
