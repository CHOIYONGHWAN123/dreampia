"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { deleteEvent } from "@/app/(dashboard)/events/actions";
import { updateEventDateField } from "@/app/(dashboard)/event-operations/actions";
import { sendCrimeCheckNotification } from "@/app/(dashboard)/institutions/actions";
import { getReportConfig } from "@/lib/report-templates/config";

type Institution = {
  id: string;
  name: string;
  address: string | null;
  is_deleted: boolean;
};

type Event = {
  id: string;
  name: string;
  memo: string | null;
  teacher_name: string | null;
  recruit_status: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  start_recruit_at: string | null;
  recruit_delivered: boolean | null;
  institution_request_status: string | null;
  estimate_file_url: string | null;
  admin_docs_delivered: boolean | null;
  contract_status: string | null;
  supplies_status: string | null;
  dateKey: string | null;
  hasMultipleDates: boolean;
  eventCategoryName: string | null;
  crime_check_method: string | null;
  crime_check_info: string | null;
  crime_check_notified: boolean | null;
};

const DISABLED_BTN =
  "px-3 py-1 text-xs border border-gray-200 rounded-full text-gray-300 cursor-not-allowed whitespace-nowrap";
const SELECT_CLS =
  "border border-gray-300 rounded-full px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-400";
const SUPPLIES_STATUS_OPTIONS = [
  "준비 완료",
  "체크 전",
  "재고 이상무",
  "재고 파악",
  "주문 필요",
  "택배 예정",
  "택배 발송",
  "회수 필요",
];

function formatDateTime(dt: string | null) {
  if (!dt) return "-";
  return new Date(dt).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
  });
}

function getEventStatus(event: Event): "진행중" | "종료" {
  if (event.event_end_at && new Date(event.event_end_at) < new Date())
    return "종료";
  return "진행중";
}

function canSendCrimeCheckNotification(event: Event) {
  return (
    event.crime_check_method === "회보서" &&
    !!event.crime_check_info?.trim()
  );
}

export function InstitutionDetailClient({
  institution,
  events,
}: {
  institution: Institution;
  events: Event[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<Event[]>(events);
  const [sendingCrimeCheckId, setSendingCrimeCheckId] = useState<
    string | null
  >(null);
  const [downloadingDocsId, setDownloadingDocsId] = useState<string | null>(
    null,
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const inProgressEvents = localEvents.filter(
    (e) => e.recruit_status === "섭외진행중" || e.recruit_status === "섭외완료",
  );

  const patchEvent = (eventId: string, patch: Partial<Event>) => {
    setLocalEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
    );
  };

  const handleUpdateField = async (
    eventId: string,
    field: string,
    value: boolean | string | null,
  ) => {
    const { error } = await supabase
      .from("events")
      .update({ [field]: value })
      .eq("id", eventId);
    if (!error) patchEvent(eventId, { [field]: value } as Partial<Event>);
  };

  // 준비물(supplies_status)은 이제 날짜별 값이라 events가 아니라 event_dates에 쓴다.
  // "준비 완료"로 바꾸면 work_logs에 로그를 남긴다.
  const handleSuppliesStatusChange = async (
    eventId: string,
    dateKey: string,
    value: string,
  ) => {
    try {
      await updateEventDateField(eventId, dateKey, { supplies_status: value });
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장에 실패했습니다.");
      return;
    }
    patchEvent(eventId, { supplies_status: value });
    if (value === "준비 완료") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("work_logs").insert({
          admin_id: user.id,
          event_id: eventId,
          task_type: "준비물 준비",
        });
      }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("이 행사를 삭제하시겠습니까?")) return;
    try {
      await deleteEvent(eventId);
      setLocalEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    }
  };

  const handleSendCrimeCheckNotification = async (event: Event) => {
    if (
      !confirm(
        "아직 회보서를 등록하지 않은 배정 강사에게 등록 요청 알림을 보내시겠습니까?",
      )
    )
      return;
    setSendingCrimeCheckId(event.id);
    try {
      await sendCrimeCheckNotification(event.id);
      patchEvent(event.id, { crime_check_notified: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "알림 발송에 실패했습니다.");
    } finally {
      setSendingCrimeCheckId(null);
    }
  };

  // 강사별 프로필/강의계획안/범죄경력서류/행정정보동의서를 모아 zip으로 압축해 내려받는다.
  // 서버에서 여러 파일을 병렬로 가져오긴 하지만 강사 수에 따라 시간이 걸릴 수 있어
  // "생성중..." 로딩 상태를 보여주고, 일부 서류가 없으면 완료 후 어떤 서류가 빠졌는지 알려준다.
  const handleDownloadAdminDocs = async (event: Event) => {
    setDownloadingDocsId(event.id);
    try {
      const res = await fetch(`/events/${event.id}/admin-docs/download`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "다운로드에 실패했습니다.");
      }

      const missingCount = Number(
        res.headers.get("X-Admin-Docs-Missing-Count") ?? "0",
      );
      const missingSummary = res.headers.get("X-Admin-Docs-Missing");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
      const fileName = match
        ? decodeURIComponent(match[1])
        : `${event.name}_행정서류.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      if (missingCount > 0) {
        const list = missingSummary
          ? decodeURIComponent(missingSummary).split("|")
          : [];
        alert(
          `일부 서류가 없어 압축파일에서 제외되었습니다 (${missingCount}건)\n\n${list.join("\n")}`,
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setDownloadingDocsId(null);
    }
  };

  const handleEstimateUpload = async (eventId: string, file: File) => {
    setUploadingId(eventId);
    const ext = file.name.split(".").pop();
    const path = `estimates/${eventId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("files")
        .getPublicUrl(path);
      await handleUpdateField(eventId, "estimate_file_url", urlData.publicUrl);
    }
    setUploadingId(null);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          기관별 행사 관리 페이지
        </h1>
        <button
          type="button"
          className="px-4 py-1.5 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
          onClick={() => router.back()}
        >
          목록으로
        </button>
      </div>

      {institution.is_deleted && (
        <div className="mb-6 p-3 bg-red-50 rounded-2xl text-sm text-red-600">
          삭제된 기관입니다. 기존 기록은 그대로 보존되어 있으며, 새 행사는
          등록할 수 없습니다.
        </div>
      )}

      {/* 학교 기본 정보 */}
      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] overflow-hidden mb-8 w-80">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2.5 text-gray-500 bg-primary-50 w-20 font-bold">
                기관명
              </td>
              <td className="px-4 py-2.5 text-gray-800">{institution.name}</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-gray-500 bg-primary-50 font-bold">
                주소
              </td>
              <td className="px-4 py-2.5 text-gray-800">
                {institution.address ?? "~"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 등록된 행사 (게시판) */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">등록된 행사</span>
            {localEvents.length > 0 && (
              <span className="text-xs font-bold text-primary-600">
                {localEvents.length}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={institution.is_deleted}
            className="px-4 py-1.5 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors whitespace-nowrap"
            onClick={() =>
              router.push(`/events/new?institutionId=${institution.id}`)
            }
          >
            행사 등록
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-12 min-w-12">
                  no
                </th>
                <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-24 min-w-24">
                  상태
                </th>
                <th className="sticky top-0 z-10 px-4 py-2.5 text-left font-bold text-primary-700 bg-primary-50 border-b border-primary-100 min-w-32">
                  행사명
                </th>
                <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28 min-w-28">
                  시작일시
                </th>
                <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28 min-w-28">
                  종료일시
                </th>
                <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-36 min-w-36">
                  담당선생님
                </th>
                <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 w-16 min-w-16" />
              </tr>
            </thead>
            <tbody>
              {localEvents.length > 0 ? (
                localEvents.map((event, index) => {
                  const status = getEventStatus(event);
                  return (
                    <tr
                      key={event.id}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <td className="px-4 py-2.5 text-center text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={
                            status === "진행중"
                              ? "inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-50 text-primary-600"
                              : "inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500"
                          }
                        >
                          [{status}]
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-800">
                        {event.name}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600">
                        {formatDateTime(event.event_start_at)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600">
                        {formatDateTime(event.event_end_at)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600">
                        {event.teacher_name ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    등록된 행사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 진행 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold text-gray-800">진행</span>
          {inProgressEvents.length > 0 && (
            <span className="text-xs font-bold text-primary-600">
              {inProgressEvents.length}
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] overflow-x-auto">
          <table className="text-sm" style={{ minWidth: "2280px" }}>
            <thead>
              <tr className="bg-primary-50 border-b border-primary-100">
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-12 min-w-12">
                  no
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-24 min-w-24">
                  시작일시
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-24 min-w-24">
                  종료일시
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-36 min-w-36">
                  행사명
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-32 min-w-32">
                  담당선생님
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-28 min-w-28">
                  강사 섭외 현황
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-24 min-w-24">
                  섭외 현황
                  <br />
                  페이지
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-32 min-w-32">
                  준비물 준비
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-32 min-w-32">
                  강사섭외일자
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-28 min-w-28">
                  강사 섭외
                  <br />
                  전달 여부
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-32 min-w-32">
                  학교요청사항
                  <br />
                  다운
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-32 min-w-32">
                  학교요청사항
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-36 min-w-36">
                  범죄경력회보서 <br />
                  조회 요청
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-28 min-w-28">
                  견적서
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-28 min-w-28">
                  행정서류
                  <br />
                  다운받기
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-28 min-w-28">
                  행정서류
                  <br />
                  전달
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-28 min-w-28">
                  계약 현황
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-32 min-w-32">
                  공지사항
                  <br />
                  알림보내기
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-28 min-w-28">
                  보고서
                  <br />
                  다운받기
                </th>
                <th className="px-3 py-2.5 text-center font-bold text-primary-700 w-16 min-w-16">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody>
              {inProgressEvents.length > 0 ? (
                inProgressEvents.map((event, index) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2.5 text-center text-gray-600">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {formatDateTime(event.event_start_at)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {formatDateTime(event.event_end_at)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-800">{event.name}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {event.teacher_name ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {event.recruit_status ? (
                        <Link
                          href={`/events/${event.id}/recruiting`}
                          className="underline underline-offset-2 hover:text-gray-600 transition-colors"
                        >
                          {event.recruit_status}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* 섭외 현황 페이지 */}
                    <td className="px-3 py-2.5 text-center">
                      <Link
                        href={`/events/${event.id}/recruiting`}
                        className="inline-block px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full bg-white hover:bg-primary-50 transition-colors whitespace-nowrap"
                      >
                        보기
                      </Link>
                    </td>

                    {/* 준비물 준비 — 날짜가 여러 개인 행사는 한 셀로 대표할 수 없어 행사운영확인표로 안내 */}
                    <td className="px-3 py-2.5 text-center">
                      {event.hasMultipleDates || !event.dateKey ? (
                        <Link
                          href="/event-operations"
                          className="text-xs text-primary-600 underline whitespace-nowrap"
                        >
                          행사운영확인표에서 확인
                        </Link>
                      ) : (
                        <select
                          value={event.supplies_status ?? "체크 전"}
                          onChange={(e) =>
                            handleSuppliesStatusChange(
                              event.id,
                              event.dateKey as string,
                              e.target.value,
                            )
                          }
                          className={SELECT_CLS}
                        >
                          {SUPPLIES_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {/* 강사섭외일자 */}
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {formatDateTime(event.start_recruit_at)}
                    </td>

                    {/* 강사 섭외 전달 여부 */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={event.recruit_delivered ? "true" : "false"}
                        onChange={(e) =>
                          handleUpdateField(
                            event.id,
                            "recruit_delivered",
                            e.target.value === "true",
                          )
                        }
                        className={SELECT_CLS}
                      >
                        <option value="false">예정</option>
                        <option value="true">완료</option>
                      </select>
                    </td>

                    {/* 학교요청사항 다운 */}
                    <td className="px-3 py-2.5 text-center">
                      <a
                        href={`/my-tasks/institution-request/${event.id}/download`}
                        className="inline-block px-3 py-1 text-xs bg-white border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                      >
                        다운
                      </a>
                    </td>

                    {/* 학교요청사항 */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={event.institution_request_status ?? "예정"}
                        onChange={(e) =>
                          handleUpdateField(
                            event.id,
                            "institution_request_status",
                            e.target.value,
                          )
                        }
                        className={SELECT_CLS}
                      >
                        <option value="예정">예정</option>
                        <option value="전달">전달</option>
                        <option value="회신">회신</option>
                      </select>
                    </td>

                    {/* 범죄경력회보서 조회 요청 알림 — 진행방식이 회보서이고 기관아이디/검증번호가
                        입력된 행사만 발송 가능. 회보서 등록 재촉이 여러 번 필요할 수 있어
                        보낸 뒤에도 계속 재발송할 수 있게 두고, 발송 이력만 배지로 표시한다. */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {event.crime_check_notified && (
                          <span className="text-[10px] font-semibold text-green-600 whitespace-nowrap">
                            발송 이력 있음
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={
                            !canSendCrimeCheckNotification(event) ||
                            sendingCrimeCheckId === event.id
                          }
                          className={
                            canSendCrimeCheckNotification(event)
                              ? "px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full bg-white hover:bg-primary-50 transition-colors whitespace-nowrap disabled:opacity-50"
                              : DISABLED_BTN
                          }
                          title={
                            canSendCrimeCheckNotification(event)
                              ? undefined
                              : "범죄경력 진행방식이 회보서이고 기관아이디/검증번호가 입력된 경우에만 발송할 수 있습니다."
                          }
                          onClick={() =>
                            handleSendCrimeCheckNotification(event)
                          }
                        >
                          {sendingCrimeCheckId === event.id
                            ? "발송중..."
                            : event.crime_check_notified
                              ? "재발송"
                              : "알림보내기"}
                        </button>
                      </div>
                    </td>

                    {/* 견적서 파일 업로드 */}
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="file"
                        className="hidden"
                        ref={(el) => {
                          fileInputRefs.current[event.id] = el;
                        }}
                        accept=".pdf,.hwp,.xlsx,.xls,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleEstimateUpload(event.id, file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingId === event.id}
                        className="px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap disabled:opacity-50"
                        onClick={() => fileInputRefs.current[event.id]?.click()}
                      >
                        {uploadingId === event.id
                          ? "업로드중..."
                          : event.estimate_file_url
                            ? "재업로드"
                            : "업로드"}
                      </button>
                    </td>

                    {/* 행정서류 다운받기 — 강사별 프로필/강의계획안/범죄경력서류/행정정보동의서를
                        모아 zip으로 내려받는다. 배정된 강사가 없으면 만들 파일이 없어 비활성화. */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        disabled={downloadingDocsId === event.id}
                        className="px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full bg-white hover:bg-primary-50 transition-colors whitespace-nowrap disabled:opacity-50"
                        onClick={() => handleDownloadAdminDocs(event)}
                      >
                        {downloadingDocsId === event.id
                          ? "생성중..."
                          : "다운받기"}
                      </button>
                    </td>

                    {/* 행정서류 전달 */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={event.admin_docs_delivered ? "true" : "false"}
                        onChange={(e) =>
                          handleUpdateField(
                            event.id,
                            "admin_docs_delivered",
                            e.target.value === "true",
                          )
                        }
                        className={SELECT_CLS}
                      >
                        <option value="false">예정</option>
                        <option value="true">완료</option>
                      </select>
                    </td>

                    {/* 계약 현황 */}
                    <td className="px-3 py-2.5 text-center text-gray-800">
                      {event.contract_status ?? "-"}
                    </td>

                    {/* 공지사항 알림보내기 - 비활성화 */}
                    <td className="px-3 py-2.5 text-center">
                      <button type="button" disabled className={DISABLED_BTN}>
                        알림보내기
                      </button>
                    </td>

                    {/* 보고서 다운받기 - 자동 생성 미지원 행사구분(진로박람회 등)은 비활성 유지 */}
                    <td className="px-3 py-2.5 text-center">
                      {getReportConfig(event.eventCategoryName) ? (
                        <a
                          href={`/events/${event.id}/report/download`}
                          className="inline-block px-3 py-1 text-xs bg-white border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                        >
                          다운받기
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className={DISABLED_BTN}
                          title="지원 예정"
                        >
                          다운받기
                        </button>
                      )}
                    </td>

                    {/* 삭제 */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded-full hover:bg-red-50 transition-colors"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={20} className="py-10 text-center text-gray-400">
                    진행 중인 행사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
