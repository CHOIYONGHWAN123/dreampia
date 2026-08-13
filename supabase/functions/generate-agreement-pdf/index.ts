// 멘토 앱 "동의서 전자서명" 기능.
//
// 클라이언트는 캔버스에 그린 서명(PNG base64)만 보낸다. 이름/주소/계좌 같은 나머지 필드는
// 클라이언트가 보낸 값을 신뢰하지 않고, 이 함수가 요청자 본인의 mentors 행을 직접 조회해서
// 채운다 — 서명 시점에 실제로 DB에 저장돼 있는 값과 PDF 내용이 항상 일치하도록 하기 위함이다.
// (mentors_self_update RLS 정책상 멘토 본인이 이 필드들을 이미 자유롭게 쓸 수 있어서, service-role로
// RLS를 우회할 필요는 없다 — 요청의 Authorization 헤더를 그대로 전달하는 사용자 컨텍스트 클라이언트로 충분하다.)
//
// PDF 템플릿(assets/template.pdf)은 아직 실제 동의서 문구/디자인이 확정되지 않아 쓰는 더미다.
// 실제 템플릿이 나오면 assets/template.pdf를 교체하고 FIELD_POSITIONS 좌표만 다시 맞추면 된다.

import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// 배포 시 static_files로 번들링한 assets/*를 Deno.readFile로 읽는 방식이
// --use-api 배포 경로에서는 실제로 함수 번들에 포함되지 않는 문제가 있어(로컬 CLI가
// Docker 없이 배포할 때만 재현됨), 대신 일반 TS 모듈 안에 base64로 직접 넣어 import한다.
import { PRETENDARD_REGULAR_BASE64, TEMPLATE_PDF_BASE64 } from "./assets-data.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// mentor-find-id/verify-identity와 동일한 이유: functions.invoke()가 2xx가 아니면 body를
// 파싱하지 않고 불투명한 에러로 감싸버리므로, 처리된 실패도 전부 200 + ok 필드로 내려준다.
function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// 나중에 실제 템플릿으로 교체할 때 이 좌표들만 다시 맞추면 된다 (PDF 좌표는 좌하단 원점).
const FIELD_POSITIONS = {
  name: { x: 60, y: 650, size: 12 },
  address: { x: 60, y: 620, size: 12 },
  bank: { x: 60, y: 590, size: 12 },
  signedAt: { x: 60, y: 100, size: 10 },
  signature: { x: 350, y: 80, width: 160, height: 60 },
} as const;

function decodeBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "허용되지 않은 요청입니다." });
  }

  // 이 블록 밖에서 예외가 나면 플랫폼이 CORS 헤더 없는 500을 내려버려서 브라우저에는
  // "CORS 정책에 의해 차단됨"으로만 보이고 실제 원인이 가려진다. 항상 jsonResponse로만 나가게 한다.
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ ok: false, error: "로그인이 필요합니다." });
    }

    let body: { signature?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "잘못된 요청입니다." });
    }

    const rawSignature = body.signature?.trim();
    if (!rawSignature) {
      return jsonResponse({ ok: false, error: "서명이 필요합니다." });
    }
    // 클라이언트가 data URL("data:image/png;base64,...")로 보내는 경우 헤더를 떼어낸다.
    const signatureBase64 = rawSignature.includes(",")
      ? rawSignature.split(",", 2)[1]
      : rawSignature;

    // 요청자 본인 권한으로만 동작하는 클라이언트 (service-role 미사용).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ ok: false, error: "로그인이 필요합니다." });
    }

    const { data: mentor, error: mentorError } = await supabase
      .from("mentors")
      .select("name, address, detail_address, bank, bank_account")
      .eq("id", user.id)
      .single();
    if (mentorError || !mentor) {
      console.error("mentor lookup failed", mentorError);
      return jsonResponse({ ok: false, error: "멘토 정보를 확인할 수 없습니다." });
    }

    let signaturePngBytes: Uint8Array;
    try {
      signaturePngBytes = Uint8Array.from(atob(signatureBase64), (c) => c.charCodeAt(0));
    } catch {
      return jsonResponse({ ok: false, error: "서명 이미지를 읽을 수 없습니다." });
    }

    const templateBytes = decodeBase64(TEMPLATE_PDF_BASE64);
    const fontBytes = decodeBase64(PRETENDARD_REGULAR_BASE64);

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);
    // subset: true로 하면 이 Pretendard 폰트에서 특정 한글 글리프가 깨져서 빈 칸으로
    // 렌더링되는 pdf-lib 버그가 있다(직접 재현·확인함). 파일 용량이 커지더라도 전체 폰트를
    // 그대로 임베드해서 이 문제를 피한다.
    const font = await pdfDoc.embedFont(fontBytes, { subset: false });
    const signatureImage = await pdfDoc.embedPng(signaturePngBytes);

    const [page] = pdfDoc.getPages();
    const address = [mentor.address, mentor.detail_address].filter(Boolean).join(" ");
    const bank = [mentor.bank, mentor.bank_account].filter(Boolean).join(" ");
    const signedAt = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    // 템플릿(assets/template.pdf)이 완전히 빈 페이지라, 더미 단계에서는 제목/안내문도
    // 여기서 같이 그린다. 실제 템플릿으로 교체하면 이 두 줄은 지우면 된다.
    page.drawText("강사 활동 동의서 (임시 템플릿)", { x: 50, y: 780, size: 20, font, color: rgb(0, 0, 0) });
    page.drawText("※ 실제 법무 검토 문구/레이아웃 확정 전까지 사용하는 더미 템플릿입니다.", {
      x: 50,
      y: 750,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(`이름: ${mentor.name ?? ""}`, {
      x: FIELD_POSITIONS.name.x,
      y: FIELD_POSITIONS.name.y,
      size: FIELD_POSITIONS.name.size,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(`주소: ${address}`, {
      x: FIELD_POSITIONS.address.x,
      y: FIELD_POSITIONS.address.y,
      size: FIELD_POSITIONS.address.size,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(`계좌: ${bank}`, {
      x: FIELD_POSITIONS.bank.x,
      y: FIELD_POSITIONS.bank.y,
      size: FIELD_POSITIONS.bank.size,
      font,
      color: rgb(0, 0, 0),
    });
    page.drawText(`서명일시: ${signedAt}`, {
      x: FIELD_POSITIONS.signedAt.x,
      y: FIELD_POSITIONS.signedAt.y,
      size: FIELD_POSITIONS.signedAt.size,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawImage(signatureImage, {
      x: FIELD_POSITIONS.signature.x,
      y: FIELD_POSITIONS.signature.y,
      width: FIELD_POSITIONS.signature.width,
      height: FIELD_POSITIONS.signature.height,
    });

    const pdfBytes = await pdfDoc.save();

    const path = `${user.id}/agreement-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("agreement-file")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      console.error("agreement pdf upload failed", uploadError);
      return jsonResponse({ ok: false, error: "동의서 저장에 실패했습니다." });
    }

    const { data: publicUrlData } = supabase.storage.from("agreement-file").getPublicUrl(path);
    const url = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("mentors")
      .update({ agreement_file_url: url })
      .eq("id", user.id);
    if (updateError) {
      console.error("mentors.agreement_file_url update failed", updateError);
      return jsonResponse({ ok: false, error: "동의서 저장에 실패했습니다." });
    }

    return jsonResponse({ ok: true, url });
  } catch (e) {
    console.error("generate-agreement-pdf unhandled error", e);
    return jsonResponse({ ok: false, error: "동의서 생성에 실패했습니다." });
  }
});
