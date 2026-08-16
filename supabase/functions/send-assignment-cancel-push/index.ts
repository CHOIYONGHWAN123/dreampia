// 강사 배정 취소 푸시 알림.
//
// event_rows.mentor_id가 값이 있다가 null로 바뀌면(관리자의 "배정 취소" 버튼, 또는 멘토
// 자기취소 RPC 둘 다) event_rows AFTER UPDATE 트리거(20260817000000)가 이 함수를 호출한다.
// 취소되기 직전 멘토였던 사람에게 "배정이 취소됐다"는 푸시를 보낸다.
//
// send-invitation-push와 마찬가지로 Postgres(pg_net)가 서버 대 서버로 직접 호출하므로
// verify_jwt = true로 배포해서 publishable key 검증만 통과하면 되고, 실제 데이터 접근은
// 이 함수 안의 service-role 클라이언트로 한다.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type TriggerPayload = {
  event_row_id: string;
  mentor_id: string;
};

type EventRowDetail = {
  id: string;
  start_time: string | null;
  end_time: string | null;
  events: { name: string | null; institutions: { name: string | null } | null } | null;
  occupation_program_unit: {
    title: string | null;
    occupation_programs: { name: string | null } | null;
  } | null;
};

async function logPush(fields: {
  mentorId: string | null;
  title: string | null;
  body: string | null;
  data: unknown;
  expoTicket?: unknown;
  status: string;
  error?: string;
}) {
  const { error } = await supabaseAdmin.from("push_notifications").insert({
    mentor_id: fields.mentorId,
    invitation_mentor_id: null,
    title: fields.title,
    body: fields.body,
    data: fields.data,
    expo_ticket: fields.expoTicket ?? null,
    status: fields.status,
    error: fields.error ?? null,
  });
  if (error) console.error("push_notifications insert failed", error);
}

// event_rows.start_time은 timezone 없는(offset 없는) 한국 로컬 wall-clock 값이라(예:
// "2026-09-07T14:20:00" = 실제 한국시간 오후 2시 20분), new Date()로 파싱한 뒤
// Intl.DateTimeFormat({ timeZone: "Asia/Seoul" })로 재변환하면 Deno 런타임이 이를 UTC로
// 오인해 9시간이 이중으로 더해진다. Date 객체를 거치지 않고 문자열에서 직접 값을 뽑는다
// (프론트엔드가 new Date(iso).getHours() 등 get* 접근자만 쓰는 것과 동일한 회피 방식).
function formatKoreanDateTime(startTime: string | null): string {
  if (!startTime) return "";
  const match = startTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return "";
  const [, , month, day, hour, minute] = match;
  const h = Number(hour);
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${Number(month)}월 ${Number(day)}일 ${period} ${h12}:${minute}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  let payload: TriggerPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }

  const { event_row_id: eventRowId, mentor_id: mentorId } = payload;
  if (!eventRowId || !mentorId) {
    return new Response(JSON.stringify({ error: "missing event_row_id or mentor_id" }), {
      status: 400,
    });
  }

  const { data: eventRow, error: eventRowError } = await supabaseAdmin
    .from("event_rows")
    .select(
      "id, start_time, end_time, events(name, institutions(name)), occupation_program_unit(title, occupation_programs(name))"
    )
    .eq("id", eventRowId)
    .maybeSingle<EventRowDetail>();

  if (eventRowError) {
    console.error("event_rows lookup failed", eventRowError);
  }

  const institutionName = eventRow?.events?.institutions?.name ?? "학교";
  const programName =
    eventRow?.occupation_program_unit?.occupation_programs?.name ??
    eventRow?.occupation_program_unit?.title ??
    null;
  const whenText = formatKoreanDateTime(eventRow?.start_time ?? null);

  const title = `${institutionName} 배정 취소`;
  const body = [whenText, programName].filter(Boolean).join(" · ") + " 배정이 취소되었습니다.";
  const data = { url: "/lecture-schedule", eventRowId };

  const { data: devices, error: devicesError } = await supabaseAdmin
    .from("mentor_devices")
    .select("expo_push_token")
    .eq("mentor_id", mentorId);

  if (devicesError) {
    console.error("mentor_devices lookup failed", devicesError);
    await logPush({ mentorId, title, body, data, status: "failed", error: devicesError.message });
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  if (!devices || devices.length === 0) {
    await logPush({ mentorId, title, body, data, status: "no_device" });
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
      title,
      body,
      data,
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
    });
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
});
