'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveAdmin, updateAdminFields, deleteAdmin, restoreAdmin, type AdminRow } from '@/app/(dashboard)/admins/actions'
import { HeaderFilter } from '@/components/ui/HeaderFilter'

const YES_NO_OPTIONS = ['예', '아니오']

function fmtDate(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AdminsClient({ admins, currentAdminId }: { admins: AdminRow[]; currentAdminId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [superFilter, setSuperFilter] = useState<string | null>(null)
  const [salesFilter, setSalesFilter] = useState<string | null>(null)
  const [commFilter, setCommFilter] = useState<string | null>(null)
  const [authFilter, setAuthFilter] = useState<string | null>(null)

  const visibleAdmins = useMemo(() => {
    return admins.filter((a) => {
      if (!showDeleted && a.isDeleted) return false
      if (superFilter && (a.isSuper ? '예' : '아니오') !== superFilter) return false
      if (salesFilter && (a.isSales ? '예' : '아니오') !== salesFilter) return false
      if (commFilter && (a.isComm ? '예' : '아니오') !== commFilter) return false
      if (authFilter && (a.isAuthenticated ? '예' : '아니오') !== authFilter) return false
      return true
    })
  }, [admins, showDeleted, superFilter, salesFilter, commFilter, authFilter])

  const runAction = (id: string, action: () => Promise<void>) => {
    setBusyId(id)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : '처리에 실패했습니다.')
      } finally {
        setBusyId(null)
      }
    })
  }

  const handleApprove = (id: string) => {
    if (!confirm('이 관리자를 승인하시겠습니까?')) return
    runAction(id, () => approveAdmin(id))
  }

  const handleToggle = (
    id: string,
    field: 'is_super' | 'is_authenticated' | 'is_sales' | 'is_comm',
    value: boolean
  ) => {
    runAction(id, () => updateAdminFields(id, { [field]: value }))
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`"${name}" 관리자를 삭제하시겠습니까?\n로그인 및 시스템 접근이 즉시 차단되고 목록에서 제외됩니다. ("삭제된 관리자 보기"에서 복구할 수 있습니다)`)) return
    runAction(id, () => deleteAdmin(id))
  }

  const handleRestore = (id: string) => {
    runAction(id, () => restoreAdmin(id))
  }

  const td = 'px-4 py-2.5 text-center text-gray-800 border-b border-gray-100'
  const th = 'px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 whitespace-nowrap sticky top-0 z-10'

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">관리자 관리</h1>
          <p className="text-sm text-gray-400 mt-1">
            등록된 관리자 <span className="font-bold text-primary-600">{visibleAdmins.length}</span>명
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="cursor-pointer accent-primary-600"
          />
          삭제된 관리자 보기
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        <table className="w-full text-sm" style={{ minWidth: '1000px' }}>
          <thead>
            <tr>
              <th className={th}>이름</th>
              <th className={th}>이메일</th>
              <th className={th}>전화번호</th>
              <th className={th}>
                <HeaderFilter label="슈퍼관리자" options={YES_NO_OPTIONS} value={superFilter} onChange={setSuperFilter} />
              </th>
              <th className={th}>
                <HeaderFilter label="영업담당" options={YES_NO_OPTIONS} value={salesFilter} onChange={setSalesFilter} />
              </th>
              <th className={th}>
                <HeaderFilter label="소통담당" options={YES_NO_OPTIONS} value={commFilter} onChange={setCommFilter} />
              </th>
              <th className={th}>
                <HeaderFilter label="승인여부" options={YES_NO_OPTIONS} value={authFilter} onChange={setAuthFilter} />
              </th>
              <th className={th}>승인자</th>
              <th className={th}>승인일</th>
              <th className={th}>가입일</th>
              <th className={th}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {visibleAdmins.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-gray-400">
                  등록된 관리자가 없습니다.
                </td>
              </tr>
            ) : (
              visibleAdmins.map((a) => {
                const isSelf = a.id === currentAdminId
                const busy = isPending && busyId === a.id
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className={`${td} text-left font-medium text-gray-900`}>
                      {a.name}
                      {isSelf && <span className="ml-1 text-xs text-gray-400">(나)</span>}
                      {a.isDeleted && <span className="ml-1 text-xs text-red-400">(삭제됨)</span>}
                    </td>
                    <td className={`${td} text-left`}>{a.email}</td>
                    <td className={td}>{a.phone ?? '-'}</td>
                    <td className={td}>
                      <input
                        type="checkbox"
                        checked={a.isSuper}
                        disabled={busy || isSelf}
                        onChange={(e) => handleToggle(a.id, 'is_super', e.target.checked)}
                        className="w-4 h-4 accent-primary-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className={td}>
                      <input
                        type="checkbox"
                        checked={a.isSales}
                        disabled={busy}
                        onChange={(e) => handleToggle(a.id, 'is_sales', e.target.checked)}
                        className="w-4 h-4 accent-primary-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className={td}>
                      <input
                        type="checkbox"
                        checked={a.isComm}
                        disabled={busy}
                        onChange={(e) => handleToggle(a.id, 'is_comm', e.target.checked)}
                        className="w-4 h-4 accent-primary-600 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className={td}>
                      {a.isAuthenticated ? (
                        <input
                          type="checkbox"
                          checked
                          disabled={busy || isSelf}
                          onChange={(e) => handleToggle(a.id, 'is_authenticated', e.target.checked)}
                          className="w-4 h-4 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApprove(a.id)}
                          className="px-3 py-1 text-xs bg-primary-500 text-white rounded-full hover:bg-primary-600 disabled:opacity-50 whitespace-nowrap"
                        >
                          승인
                        </button>
                      )}
                    </td>
                    <td className={td}>{a.approvedByName ?? '-'}</td>
                    <td className={td}>{fmtDate(a.approvedAt)}</td>
                    <td className={td}>{fmtDate(a.createdAt)}</td>
                    <td className={td}>
                      {isSelf ? (
                        <span className="text-xs text-gray-300">-</span>
                      ) : a.isDeleted ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRestore(a.id)}
                          className="px-2 py-0.5 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          복구
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(a.id, a.name)}
                          className="px-2 py-0.5 text-xs border border-red-300 text-red-500 rounded-full hover:bg-red-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
