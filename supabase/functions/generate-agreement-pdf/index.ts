// 멘토 앱 "동의서 전자서명" 기능.
//
// 클라이언트는 캔버스에 그린 서명(PNG base64) 하나만 보낸다. 이름/연락처/주민번호 같은
// 나머지 필드는 클라이언트가 보낸 값을 신뢰하지 않고, 이 함수가 요청자 본인의 mentors 행을
// 직접 조회해서 채운다 — 서명 시점에 실제로 DB에 저장돼 있는 값과 PDF 내용이 항상 일치하도록
// 하기 위함이다. (mentors_self_update RLS 정책상 멘토 본인이 이 필드들을 이미 자유롭게 쓸 수
// 있어서, service-role로 RLS를 우회할 필요는 없다 — 요청의 Authorization 헤더를 그대로
// 전달하는 사용자 컨텍스트 클라이언트로 충분하다.)
//
// 법정 서식 3종(성범죄 및 아동학대관련범죄 전력 조회 동의서 / 행정정보 공동이용 사전동의서 /
// 강사계약서)에 서명 1회로 한 번에 서명해서, 각각 별도 PDF로 생성한다. 세 문서 모두
// AcroForm(채움 가능 필드)이 없는 플랫 PDF라 좌표를 직접 지정해 텍스트/서명 이미지를
// 덧그리는 방식을 쓴다 — 좌표는 각 템플릿을 렌더링해 실측한 값이다. 템플릿이 바뀌면
// FIELD_POSITIONS도 다시 맞춰야 한다.
//
// 세 문서 모두 본문에 주민등록번호가 그대로 찍히기 때문에, 생성된 PDF는 private 버킷
// (consent-file)에 저장한다 — 기존 더미 동의서(agreement-file, public 버킷)와 달리
// getPublicUrl()을 쓰지 않고 경로만 mentors 테이블에 저장한다. 열람은 createSignedUrl()로.

import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// 배포 시 static_files로 번들링한 assets/*를 Deno.readFile로 읽는 방식이
// --use-api 배포 경로에서는 실제로 함수 번들에 포함되지 않는 문제가 있어(로컬 CLI가
// Docker 없이 배포할 때만 재현됨), 대신 일반 TS 모듈 안에 base64로 직접 넣어 import한다.
import {
  PRETENDARD_REGULAR_BASE64,
  CRIMINAL_RECORD_CONSENT_PDF_BASE64,
  ADMIN_INFO_CONSENT_PDF_BASE64,
  CONTRACT_PDF_BASE64,
} from "./assets-data.ts";

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

function decodeBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

// 실제 템플릿을 150dpi로 렌더링해 좌표를 실측한 값. 좌표 원점은 pdf-lib 기준(좌하단, y 위로 증가).
const CRIMINAL_RECORD_POSITIONS = {
  pageHeight: 842,
  name: { x: 330, y: 654, size: 11 },
  idNumber: { x: 390, y: 604, size: 11 },
  phone: { x: 245, y: 557, size: 11 },
  dateYear: { x: 405, y: 376, size: 10 },
  dateMonth: { x: 457, y: 376, size: 10 },
  dateDay: { x: 510, y: 376, size: 10 },
  signerName: { x: 362, y: 329, size: 9 },
  signature: { x: 408, y: 320, width: 60, height: 24 },
} as const;

const ADMIN_INFO_POSITIONS = {
  pageHeight: 842,
  idNumber: { x: 368, y: 375, size: 10 },
  name: { x: 336, y: 147, size: 10 },
  birthDate: { x: 336, y: 128, size: 10 },
  phone: { x: 336, y: 109, size: 10 },
  dateYear: { x: 335, y: 186, size: 10 },
  dateMonth: { x: 392, y: 186, size: 10 },
  dateDay: { x: 422, y: 186, size: 10 },
  signature: { x: 430, y: 142, width: 68, height: 22 },
} as const;

// 강사계약서는 4페이지 중 마지막 장(index 3)에 "을" 서명란이 있다.
const CONTRACT_POSITIONS = {
  pageIndex: 3,
  pageHeight: 840,
  dateYear: { x: 215, y: 382, size: 10 },
  dateMonth: { x: 278, y: 382, size: 10 },
  dateDay: { x: 316, y: 382, size: 10 },
  name: { x: 408, y: 314, size: 10 },
  signature: { x: 452, y: 310, width: 56, height: 18 },
} as const;

function getKoreaDateParts(): { year: string; month: string; day: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { year: parts.year, month: parts.month, day: parts.day };
}

// 주민등록번호 앞 6자리 + 성별 구분 숫자로 생년월일을 계산한다 (1·2·5·6 → 1900년대, 3·4·7·8 → 2000년대).
function birthDateFromIdNumber(idNumber: string | null): string {
  if (!idNumber) return "";
  const digits = idNumber.replace(/[^0-9]/g, "");
  if (digits.length < 7) return "";
  const centuryMap: Record<string, string> = {
    "1": "19", "2": "19", "5": "19", "6": "19",
    "3": "20", "4": "20", "7": "20", "8": "20",
  };
  const century = centuryMap[digits[6]];
  if (!century) return "";
  return `${century}${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
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
      .select("name, phone, id_number")
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

    const fontBytes = decodeBase64(PRETENDARD_REGULAR_BASE64);
    const { year, month, day } = getKoreaDateParts();
    const name = mentor.name ?? "";
    const phone = mentor.phone ?? "";
    const idNumber = mentor.id_number ?? "";
    const birthDate = birthDateFromIdNumber(mentor.id_number);

    // 같은 서명 이미지를 문서 3개에 재사용하므로, PDFDocument마다 각자 embedPng/embedFont를
    // 새로 해야 한다 (pdf-lib의 임베드 리소스는 자신을 만든 PDFDocument에 종속된다).
    async function preparePdf(templateBase64: string) {
      const pdfDoc = await PDFDocument.load(decodeBase64(templateBase64));
      pdfDoc.registerFontkit(fontkit);
      // subset: true로 하면 이 Pretendard 폰트에서 특정 한글 글리프가 깨져서 빈 칸으로
      // 렌더링되는 pdf-lib 버그가 있다(직접 재현·확인함). 파일 용량이 커지더라도 전체 폰트를
      // 그대로 임베드해서 이 문제를 피한다.
      const font = await pdfDoc.embedFont(fontBytes, { subset: false });
      const signatureImage = await pdfDoc.embedPng(signaturePngBytes);
      return { pdfDoc, font, signatureImage };
    }

    // ── 1) 성범죄 및 아동학대관련범죄 전력 조회 동의서 ──────────────────────
    const criminalRecordPdf = await (async () => {
      const { pdfDoc, font, signatureImage } = await preparePdf(CRIMINAL_RECORD_CONSENT_PDF_BASE64);
      const [page] = pdfDoc.getPages();
      const p = CRIMINAL_RECORD_POSITIONS;
      const draw = (text: string, pos: { x: number; y: number; size: number }) =>
        page.drawText(text, { x: pos.x, y: pos.y, size: pos.size, font, color: rgb(0, 0, 0) });
      draw(name, p.name);
      draw(idNumber, p.idNumber);
      draw(phone, p.phone);
      draw(year, p.dateYear);
      draw(month, p.dateMonth);
      draw(day, p.dateDay);
      draw(name, p.signerName);
      page.drawImage(signatureImage, p.signature);
      return pdfDoc.save();
    })();

    // ── 2) 행정정보 공동이용 사전동의서 ──────────────────────────────────
    const adminInfoPdf = await (async () => {
      const { pdfDoc, font, signatureImage } = await preparePdf(ADMIN_INFO_CONSENT_PDF_BASE64);
      const [page] = pdfDoc.getPages();
      const p = ADMIN_INFO_POSITIONS;
      const draw = (text: string, pos: { x: number; y: number; size: number }) =>
        page.drawText(text, { x: pos.x, y: pos.y, size: pos.size, font, color: rgb(0, 0, 0) });
      draw(idNumber, p.idNumber);
      draw(name, p.name);
      draw(birthDate, p.birthDate);
      draw(phone, p.phone);
      draw(year, p.dateYear);
      draw(month, p.dateMonth);
      draw(day, p.dateDay);
      page.drawImage(signatureImage, p.signature);
      return pdfDoc.save();
    })();

    // ── 3) 강사계약서 ────────────────────────────────────────────────
    const contractPdf = await (async () => {
      const { pdfDoc, font, signatureImage } = await preparePdf(CONTRACT_PDF_BASE64);
      const page = pdfDoc.getPages()[CONTRACT_POSITIONS.pageIndex];
      const p = CONTRACT_POSITIONS;
      const draw = (text: string, pos: { x: number; y: number; size: number }) =>
        page.drawText(text, { x: pos.x, y: pos.y, size: pos.size, font, color: rgb(0, 0, 0) });
      draw(year, p.dateYear);
      draw(month, p.dateMonth);
      draw(day, p.dateDay);
      draw(name, p.name);
      page.drawImage(signatureImage, p.signature);
      return pdfDoc.save();
    })();

    const timestamp = Date.now();
    const uploads: Array<{ column: string; path: string; bytes: Uint8Array }> = [
      { column: "criminal_record_consent_file_url", path: `${user.id}/criminal-record-consent-${timestamp}.pdf`, bytes: criminalRecordPdf },
      { column: "admin_info_consent_file_url", path: `${user.id}/admin-info-consent-${timestamp}.pdf`, bytes: adminInfoPdf },
      { column: "contract_file_url", path: `${user.id}/contract-${timestamp}.pdf`, bytes: contractPdf },
    ];

    for (const { path, bytes } of uploads) {
      const { error: uploadError } = await supabase.storage
        .from("consent-file")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (uploadError) {
        console.error("consent pdf upload failed", path, uploadError);
        return jsonResponse({ ok: false, error: "동의서 저장에 실패했습니다." });
      }
    }

    const updatePayload = Object.fromEntries(uploads.map((u) => [u.column, u.path]));
    const { error: updateError } = await supabase.from("mentors").update(updatePayload).eq("id", user.id);
    if (updateError) {
      console.error("mentors consent file url update failed", updateError);
      return jsonResponse({ ok: false, error: "동의서 저장에 실패했습니다." });
    }

    return jsonResponse({
      ok: true,
      paths: {
        criminalRecordConsent: uploads[0].path,
        adminInfoConsent: uploads[1].path,
        contract: uploads[2].path,
      },
    });
  } catch (e) {
    console.error("generate-agreement-pdf unhandled error", e);
    return jsonResponse({ ok: false, error: "동의서 생성에 실패했습니다." });
  }
});
