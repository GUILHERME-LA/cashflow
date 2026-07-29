"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { History, Loader2, User, ArrowRight, Pencil, PlusCircle, Trash2 } from "lucide-react"
import { formatDateFull } from "@/lib/utils"

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  performed_by: string | null
  created_at: string
  user_name?: string
  user_email?: string
}

interface Lookups {
  categories: Record<string, string>
  users: Record<string, string>
}

function getActionConfig(action: string) {
  switch (action) {
    case "create":
      return { icon: PlusCircle, color: "text-green-600", bg: "bg-green-50", label: "Created" }
    case "update":
      return { icon: Pencil, color: "text-blue-600", bg: "bg-blue-50", label: "Updated" }
    case "delete":
      return { icon: Trash2, color: "text-red-600", bg: "bg-red-50", label: "Deleted" }
    default:
      return { icon: History, color: "text-gray-600", bg: "bg-gray-50", label: action }
  }
}

const FIELD_LABELS: Record<string, string> = {
  type: "Type", date: "Date", description: "Description",
  value: "Value", who: "Who", payment_method: "Payment",
  notes: "Notes", status: "Status", category_id: "Category", updated_by: "Updated by",
}

const PAYMENT_METHODS: Record<string, string> = {
  dinheiro: "Cash", pix: "PIX", cartao: "Card",
  boleto: "Boleto", transferencia: "Transfer",
  credito: "Credit", debito: "Debit",
}

function formatValue(val: string | null, field: string, lookups: Lookups): string {
  if (!val || val === "NULL") return "—"
  if (field === "value") {
    const num = parseFloat(val)
    if (!isNaN(num)) return `R$ ${num.toFixed(2).replace(".", ",")}`
  }
  if (field === "type") return val === "revenue" ? "Revenue" : "Expense"
  if (field === "status") {
    const map: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" }
    return map[val] || val
  }
  if (field === "payment_method") return PAYMENT_METHODS[val] || val
  if (field === "category_id") return lookups.categories[val] || val
  if (field === "updated_by") return lookups.users[val] || val
  return val.length > 50 ? val.substring(0, 50) + "..." : val
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lookups, setLookups] = useState<Lookups>({ categories: {}, users: {} })
  const supabase = createClient()

  useEffect(() => {
    loadAudit()
  }, [])

  async function loadAudit() {
    setLoading(true)

    const [logsRes, catsRes, usersRes] = await Promise.all([
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("categories").select("id, name"),
      supabase.from("users").select("id, name, email"),
    ])

    const logs = logsRes.data || []
    const lkps: Lookups = {
      categories: Object.fromEntries((catsRes.data || []).map((c) => [c.id, c.name])),
      users: Object.fromEntries((usersRes.data || []).map((u) => [u.id, u.name || u.email])),
    }
    setLookups(lkps)

    const enriched = logs.map((log) => ({
      ...log,
      user_name: log.performed_by ? lkps.users[log.performed_by] || "Removed user" : "System",
    }))

    setEntries(enriched)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">History</h2>
        <p className="text-sm text-gray-500 mt-1">All actions performed in the system</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-green-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 shadow-sm">
          <History size={40} className="mx-auto mb-4 text-gray-300" />
          No actions recorded yet
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const config = getActionConfig(entry.action)
            const Icon = config.icon
            const isUpdate = entry.action === "update" && entry.field_changed

            return (
              <div
                key={entry.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg} shrink-0`}>
                    <Icon size={16} className={config.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400 capitalize">{entry.entity_type}</span>
                    </div>

                    {isUpdate && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-gray-500 font-medium">{FIELD_LABELS[entry.field_changed!] || entry.field_changed}:</span>
                        <span className="text-red-500 line-through text-xs">{formatValue(entry.old_value, entry.field_changed!, lookups)}</span>
                        <ArrowRight size={12} className="text-gray-400 shrink-0" />
                        <span className="text-green-600 font-medium text-xs">{formatValue(entry.new_value, entry.field_changed!, lookups)}</span>
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <User size={12} />
                      <span>{entry.user_name}</span>
                      <span>•</span>
                      <span>{formatDateFull(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
