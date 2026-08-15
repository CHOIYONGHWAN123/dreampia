// 강사 섭외 초대 푸시 알림.
//
// invitation_mentors 테이블에 새 행이 생기면(관리자 수동 초대든, 자동배정 최초 생성/재배정이든,
// 10분마다 도는 expire_stale_invitations 크론이 다음 후보로 넘기는 경우든 — 전부 결국 이 테이블에
// insert된다) Supabase Database Webhook이 이 함수를 호출한다. 대상 멘토의 Expo 푸시 토큰을 조회해
// "강의요청" 화면으로 딥링크되는 알림을 보낸다.
//
// 이 함수는 브라우저가 아니라 Postgres(supabase_functions.http_request 트리거)가 서버 대 서버로
// 호출하므로 supabase-js의 functions.invoke()를 쓰지 않는다 — 그래서 다른 함수들과 달리 항상 200을
// 내려줄 필요가 없고, 실제 HTTP 상태 코드를 그대로 쓴다. verify_jwt = true로 배포해서, 플랫폼이
// supabase_functions.http_request가 자동으로 붙이는 service-role 인증을 검증해준다(별도 시크릿 불필요).

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type WebhookPayload = {
  type: string;
  table: string;
  record: {
    id: string;
    mentor_id: string;
    invitation_id: string;
  };
};

type InvitationRequestRow = {
  institution_name: string | null;
  program_name: string | null;
  unit_title: string | null;
};

async function logPush(fields: {
  mentorId: string | null;
  invitationMentorId: string | null;
  title: string | null;
  body: string | null;
  data: unknown;
  expoTicket?: unknown;
  status: string;
  error?: string;
}) {
  const { error } = await supabaseAdmin.from("push_notifications").insert({
    mentor_id: fields.mentorId,
    invitation_mentor_id: fields.invitationMentorId,
    title: fields.title,
    body: fields.body,
    data: fields.data,
    expo_ticket: fields.expoTicket ?? null,
    status: fields.status,
    error: fields.error ?? null,
  });
  if (error) console.error("push_notifications insert failed", error);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }

  if (payload.table !== "invitation_mentors" || payload.type !== "INSERT") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const invitationMentorId = payload.record.id;
  const mentorId = payload.record.mentor_id;

  const { data: requestRows, error: requestError } = await supabaseAdmin
    .from("mentor_invitation_requests")
    .select("institution_name, program_name, unit_title")
    .eq("invitation_mentor_id", invitationMentorId);

  if (requestError) {
    console.error("mentor_invitation_requests lookup failed", requestError);
  }

  const rows = (requestRows ?? []) as InvitationRequestRow[];
  const first = rows[0];
  const institutionName = first?.institution_name ?? "학교";
  const extraCount = rows.length > 1 ? ` 외 ${rows.length - 1}건` : "";
  const title = `${institutionName} 강사 섭외 요청`;
  const body = first?.program_name
    ? `${first.program_name}${first.unit_title ? ` (${first.unit_title})` : ""}${extraCount} 프로그램에 초대되었습니다.`
    : "새로운 강의 요청이 도착했습니다.";
  const data = { url: "/invitations", invitationMentorId };

  const { data: devices, error: devicesError } = await supabaseAdmin
    .from("mentor_devices")
    .select("expo_push_token")
    .eq("mentor_id", mentorId);

  if (devicesError) {
    console.error("mentor_devices lookup failed", devicesError);
    await logPush({
      mentorId,
      invitationMentorId,
      title,
      body,
      data,
      status: "failed",
      error: devicesError.message,
    });
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  if (!devices || devices.length === 0) {
    await logPush({ mentorId, invitationMentorId, title, body, data, status: "no_device" });
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
  }

  const messages = devices.map((d) => ({
    to: d.expo_push_token,
    title,
    body,
    data,
    sound: "default",
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
    const result = await res.json();
    await logPush({
      mentorId,
      invitationMentorId,
      title,
      body,
      data,
      expoTicket: result,
      status: res.ok ? "sent" : "failed",
      error: res.ok ? undefined : JSON.stringify(result),
    });
    return new Response(JSON.stringify({ ok: res.ok, sent: messages.length }), {
      status: res.ok ? 200 : 502,
    });
  } catch (e) {
    console.error("expo push send failed", e);
    await logPush({
      mentorId,
      invitationMentorId,
      title,
      body,
      data,
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    });
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
});
