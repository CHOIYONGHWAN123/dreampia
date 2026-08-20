// 강의 시작 전 "준비중"/"출석" 체크를 유도하는 푸시 알림.
//
// pg_cron이 5분마다 send_lecture_reminders()를 돌려, 준비중 알림 대상(강의 시작 4시간 이내)과
// 출석 알림 대상(강의 시작 20분 이내)을 찾아 이 함수를 호출한다(pg_net). 알림을 탭하면
// 멘토 앱의 강의 상세 화면(app/lecture-schedule-detail.tsx)으로 이동해 그 자리에서 체크한다.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type ReminderType = "preparing" | "attendance";

type TriggerPayload = {
  type: ReminderType;
  event_row_id: string;
  mentor_id: string;
};

type EventRowDetail = {
  id: string;
  events: { institutions: { name: string | null } | null } | null;
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

function buildMessage(type: ReminderType, institutionName: string) {
  if (type === "preparing") {
    return {
      title: `${institutionName} 강의 준비 확인`,
      body:
        "대기실에 강의시작 30분 전까지 도착해주세요. 도착하시면 이 알림을 눌러 '준비중'을 체크해주세요. (늦으실 경우 도착 예정 시간을 관리자에게 알려주세요.)",
    };
  }
  return {
    title: `${institutionName} 출석 체크`,
    body: "곧 강의가 시작됩니다. 이 알림을 눌러 출석을 체크해주세요.",
  };
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

  const { type, event_row_id: eventRowId, mentor_id: mentorId } = payload;
  if (!type || !eventRowId || !mentorId) {
    return new Response(JSON.stringify({ error: "missing type, event_row_id or mentor_id" }), {
      status: 400,
    });
  }

  const { data: eventRow, error: eventRowError } = await supabaseAdmin
    .from("event_rows")
    .select("id, events(institutions(name))")
    .eq("id", eventRowId)
    .maybeSingle<EventRowDetail>();

  if (eventRowError) {
    console.error("event_rows lookup failed", eventRowError);
  }

  const institutionName = eventRow?.events?.institutions?.name ?? "학교";
  const { title, body } = buildMessage(type, institutionName);
  const data = { url: `/lecture-schedule-detail?id=${eventRowId}`, eventRowId };

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
