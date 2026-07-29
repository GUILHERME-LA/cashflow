"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { History, Loader2 } from "lucide-react"
import { formatDateFull } from "@/lib/utils"
import type { AuditLogEntry } from "@/types"

function getActionColor(action: string) {
  switch (action) {
    case "create": return "bg-green-50 text-green-600"
    case "update": return "bg-blue-50 text-blue-600"
    case "delete": return "bg-red-50 text-red-600"
    default: return "bg-gray-50 text-gray-600"
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case "create": return "Criou"
    case "update": return "Editou"
    case "delete": return "Excluiu"
    default: return action
  }
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAudit()
  }, [])

  async function loadAudit() {
    setLoading(true)
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
    setEntries((data || []) as AuditLogEntry[])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Histórico</h2>
        <p className="text-sm text-gray-500 mt-1">Histórico completo de todas as ações</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-green-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 shadow-sm">
          <History size={40} className="mx-auto mb-4 text-gray-300" />
          Nenhuma ação registrada ainda
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
            >
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase shrink-0 ${getActionColor(entry.action)}`}>
                {getActionLabel(entry.action)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {entry.entity_type} —{" "}
                  {entry.field_changed
                    ? `${entry.field_changed}: "${entry.old_value}" → "${entry.new_value}"`
                    : entry.entity_id}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateFull(entry.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
