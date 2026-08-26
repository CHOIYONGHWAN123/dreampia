"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SupplyFormPopup } from "./SupplyFormPopup";
import { StockAdjustPopup } from "./StockAdjustPopup";

// 재고는 occupation_programs(프로그램) 단위로 관리된다 — 같은 프로그램의 유닛들
// (예: 초등/중고등)이 강의를 나갈 때마다 이 재고를 함께 소진한다.
export type ProgramWithSupply = {
  id: string;
  programName: string;
  fieldId: string;
  fieldName: string;
  occupationId: string;
  occupationName: string;
  supply: {
    id: string;
    qty_per_person: number;
    kit_threshold: number | null;
    max_daily_stock: number | null;
    is_consumable: boolean;
    memo: string | null;
  } | null;
  totalStock: number;
  kitStock: number;
  maxActiveHeadcount: number;
  nextEventStartAt: string | null;
};

type NavOption = { id: string; name: string };

interface Props {
  programs: ProgramWithSupply[];
  fields: NavOption[];
}

const PAGE_SIZE = 50;

const STATUS_CLS = {
  safe: "inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-50 text-primary-600",
  danger: "inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-500",
};

// 키트 재고 상태가 "위험"인지 여부 - StockStatus의 판정 로직과 동일하게 맞춘다.
function isKitStockDanger(p: ProgramWithSupply): boolean {
  const threshold = p.supply?.kit_threshold ?? null;
  if (threshold === null) return false;
  return p.kitStock < threshold;
}

function StockStatus({
  current,
  threshold,
  dangerWhenBelow,
}: {
  current: number;
  threshold: number | null;
  dangerWhenBelow: boolean;
}) {
  if (threshold === null)
    return <span className="text-xs text-gray-400">-</span>;
  const isDanger = dangerWhenBelow ? current < threshold : current > threshold;
  return (
    <span className={isDanger ? STATUS_CLS.danger : STATUS_CLS.safe}>
      {isDanger ? "위험" : "안전"}
    </span>
  );
}

export function SuppliesClient({ programs, fields }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterFieldId, setFilterFieldId] = useState("");
  const [filterOccupationId, setFilterOccupationId] = useState("");
  const [filterProgramId, setFilterProgramId] = useState("");
  const [page, setPage] = useState(1);
  const [popup, setPopup] = useState<{
    programId: string;
    programLabel: string;
    supply: ProgramWithSupply["supply"];
  } | null>(null);
  const [adjustPopup, setAdjustPopup] = useState<{
    supplyId: string;
    programLabel: string;
    totalStock: number;
    kitStock: number;
  } | null>(null);

  const occupations = useMemo(() => {
    const seen = new Map<string, NavOption>();
    programs.forEach((p) => {
      if (!filterFieldId || p.fieldId === filterFieldId) {
        if (!seen.has(p.occupationId))
          seen.set(p.occupationId, {
            id: p.occupationId,
            name: p.occupationName,
          });
      }
    });
    return Array.from(seen.values());
  }, [programs, filterFieldId]);

  const programOptions = useMemo(() => {
    return programs
      .filter(
        (p) =>
          (!filterFieldId || p.fieldId === filterFieldId) &&
          (!filterOccupationId || p.occupationId === filterOccupationId)
      )
      .map((p) => ({ id: p.id, name: p.programName }));
  }, [programs, filterFieldId, filterOccupationId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = programs.filter((p) => {
      if (filterFieldId && p.fieldId !== filterFieldId) return false;
      if (filterOccupationId && p.occupationId !== filterOccupationId)
        return false;
      if (filterProgramId && p.id !== filterProgramId) return false;
      if (q) {
        const haystack = [p.programName, p.occupationName, p.fieldName]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // 1) 키트 재고 상태가 "위험"인 항목을 위로, 2) 그중/나머지는 가장 임박한
    // 행사(진행 중이거나 아직 시작하지 않은 행사)가 있는 순으로 정렬. 다가오는
    // 행사가 없는 항목은 맨 뒤로 보낸다.
    return [...result].sort((a, b) => {
      const dangerDiff = Number(isKitStockDanger(b)) - Number(isKitStockDanger(a));
      if (dangerDiff !== 0) return dangerDiff;

      if (a.nextEventStartAt && b.nextEventStartAt) {
        return a.nextEventStartAt < b.nextEventStartAt ? -1 : a.nextEventStartAt > b.nextEventStartAt ? 1 : 0;
      }
      if (a.nextEventStartAt) return -1;
      if (b.nextEventStartAt) return 1;
      return 0;
    });
  }, [programs, search, filterFieldId, filterOccupationId, filterProgramId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const changeFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const thCls =
    "px-3 py-2.5 text-xs font-bold text-primary-700 text-center bg-primary-50 border-b border-r border-primary-100 whitespace-nowrap sticky top-0 z-10";
  const td =
    "px-3 py-2.5 text-xs text-gray-700 text-center border-b border-r border-gray-100";

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">준비물 관리</h1>
        <a
          href="/supplies/logs"
          className="px-4 py-1.5 text-sm border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
        >
          기간별 준비물 현황
        </a>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => changeFilter(() => setSearch(e.target.value))}
          placeholder="분야 / 직종 / 프로그램명 검색"
          className="border border-gray-200 rounded-full px-4 py-1.5 text-sm outline-none focus:border-primary-400 w-64"
        />

        <select
          value={filterFieldId}
          onChange={(e) =>
            changeFilter(() => {
              setFilterFieldId(e.target.value);
              setFilterOccupationId("");
              setFilterProgramId("");
            })
          }
          className="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white outline-none focus:border-primary-400"
        >
          <option value="">분야 전체</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <select
          value={filterOccupationId}
          onChange={(e) =>
            changeFilter(() => {
              setFilterOccupationId(e.target.value);
              setFilterProgramId("");
            })
          }
          disabled={!filterFieldId}
          className="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white outline-none focus:border-primary-400 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">직종 전체</option>
          {occupations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <select
          value={filterProgramId}
          onChange={(e) => changeFilter(() => setFilterProgramId(e.target.value))}
          disabled={!filterOccupationId}
          className="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white outline-none focus:border-primary-400 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">프로그램 전체</option>
          {programOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500 ml-2">
          검색 결과{" "}
          <span className="font-bold text-primary-600">{filtered.length}</span>
          건
        </span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        <table
          className="text-xs border-collapse w-full"
          style={{ minWidth: "900px" }}
        >
          <thead>
            <tr>
              <th className={thCls} style={{ width: 40 }}>
                NO
              </th>
              <th className={thCls} style={{ width: 72 }}>
                분야
              </th>
              <th className={thCls} style={{ width: 100 }}>
                직종
              </th>
              <th className={thCls} style={{ width: 180 }}>
                프로그램
              </th>
              <th className={thCls} style={{ width: 72 }}>
                총 재고
              </th>
              <th className={thCls} style={{ width: 72 }}>
                여유 재고
              </th>
              <th className={thCls} style={{ width: 84 }}>
                키트 재고
              </th>
              <th className={thCls} style={{ width: 90 }}>
                키트 재고 상태
              </th>
              <th className={thCls} style={{ width: 96 }}>
                일 최대 수용
              </th>
              <th
                className={thCls}
                style={{ width: 96 }}
                title="예정/진행 중인 행사 중 일 최대 수용량을 초과하는 인원수가 있으면 위험으로 표시"
              >
                일 최대 수용 상태
              </th>
              <th className={thCls} style={{ width: 96 }}>
                변동 이력
              </th>
              <th className={thCls} style={{ width: 80 }}>
                재고 조정
              </th>
              <th className={thCls} style={{ width: 80 }}>
                수정하기
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-16 text-center text-gray-400">
                  {search || filterFieldId
                    ? "검색 결과가 없습니다."
                    : "등록된 프로그램이 없습니다."}
                </td>
              </tr>
            ) : (
              paginated.map((p, i) => {
                const freeStock = p.totalStock - p.kitStock;
                const hasSup = !!p.supply;
                const programLabel = p.programName;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className={td}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td className={td}>{p.fieldName}</td>
                    <td className={td}>{p.occupationName}</td>
                    <td className={`${td} text-left font-medium text-gray-800`}>
                      {programLabel}
                    </td>

                    {hasSup ? (
                      <>
                        <td className={td}>{p.totalStock.toLocaleString()}</td>
                        <td className={td}>{freeStock.toLocaleString()}</td>
                        <td className={td}>{p.kitStock.toLocaleString()}</td>
                        <td className={td}>
                          <StockStatus
                            current={p.kitStock}
                            threshold={p.supply!.kit_threshold}
                            dangerWhenBelow
                          />
                        </td>
                        <td className={td}>
                          {p.supply!.max_daily_stock != null
                            ? p.supply!.max_daily_stock.toLocaleString()
                            : "-"}
                        </td>
                        <td className={td}>
                          <StockStatus
                            current={p.maxActiveHeadcount}
                            threshold={p.supply!.max_daily_stock}
                            dangerWhenBelow={false}
                          />
                        </td>
                      </>
                    ) : (
                      <td colSpan={8} className={td}>
                        <span className="text-gray-400 text-xs">
                          재고 미등록
                        </span>
                      </td>
                    )}

                    {hasSup && (
                      <td className={td}>
                        <a
                          href={`/supplies/logs?supplyId=${p.supply!.id}`}
                          className="px-2.5 py-0.5 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                        >
                          현황 보기
                        </a>
                      </td>
                    )}

                    {hasSup && (
                      <td className={td}>
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustPopup({
                              supplyId: p.supply!.id,
                              programLabel,
                              totalStock: p.totalStock,
                              kitStock: p.kitStock,
                            })
                          }
                          className="px-2.5 py-0.5 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                        >
                          재고 조정
                        </button>
                      </td>
                    )}

                    <td className={td}>
                      <button
                        type="button"
                        onClick={() =>
                          setPopup({
                            programId: p.id,
                            programLabel,
                            supply: p.supply,
                          })
                        }
                        className="px-2.5 py-0.5 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
                      >
                        {hasSup ? "수정" : "추가"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-6">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center justify-center w-9 h-9 text-sm border rounded-full transition-colors border-gray-200 text-gray-600 hover:bg-gray-50 disabled:border-gray-100 disabled:text-gray-300 disabled:pointer-events-none"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-gray-400 text-sm">···</span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex items-center justify-center w-9 h-9 text-sm border rounded-full transition-colors ${
                    p === currentPage
                      ? "bg-primary-500 text-white border-primary-500 font-bold"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              </span>
            ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center justify-center w-9 h-9 text-sm border rounded-full transition-colors border-gray-200 text-gray-600 hover:bg-gray-50 disabled:border-gray-100 disabled:text-gray-300 disabled:pointer-events-none"
          >
            ›
          </button>
        </div>
      )}

      {popup && (
        <SupplyFormPopup
          programId={popup.programId}
          programLabel={popup.programLabel}
          initial={popup.supply}
          onClose={() => setPopup(null)}
          onSaved={() => router.refresh()}
        />
      )}

      {adjustPopup && (
        <StockAdjustPopup
          supplyId={adjustPopup.supplyId}
          unitTitle={adjustPopup.programLabel}
          totalStock={adjustPopup.totalStock}
          kitStock={adjustPopup.kitStock}
          onClose={() => setAdjustPopup(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
