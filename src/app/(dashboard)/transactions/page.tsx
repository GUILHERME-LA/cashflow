"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2, Search, Loader2, Check } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Transaction } from "@/types"

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [toast, setToast] = useState<string | null>(null)
  const supabase = createClient()

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, category:categories(name, type, color)")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
      if (error) throw error
      setTransactions((data || []) as Transaction[])
    } catch (err) {
      console.error("Erro ao carregar transações:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDelete(tx: Transaction) {
    if (!confirm(`Excluir "${tx.description}" — R$ ${tx.value.toFixed(2)}?`)) return
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", tx.id)
      if (error) throw error
      showToast("Transação excluída")
      await loadData()
    } catch (err) {
      console.error("Erro ao excluir:", err)
      showToast("Erro ao excluir transação")
    }
  }

  const filtered = transactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false
    if (filterStatus !== "all" && tx.status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        tx.description.toLowerCase().includes(s) ||
        tx.who?.toLowerCase().includes(s) ||
        tx.category?.name?.toLowerCase().includes(s)
      )
    }
    return true
  })

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    received: "Recebido",
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-right-4">
          <Check size={16} />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transações</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie receitas e despesas</p>
        </div>
        <button
          onClick={() => router.push("/transactions/new")}
          className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
        >
          <Plus size={16} />
          Nova Transação
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, quem ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none"
        >
          <option value="all">Todos os tipos</option>
          <option value="revenue">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none"
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="received">Recebido</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-green-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 shadow-sm">
          {transactions.length === 0
            ? "Nenhuma transação encontrada. Crie a primeira!"
            : "Nenhum resultado para os filtros aplicados"}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Data</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Quem</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-900 whitespace-nowrap">{formatDate(tx.date)}</td>
                    <td className="py-3 px-4 text-gray-900 max-w-xs truncate">{tx.description}</td>
                    <td className="py-3 px-4 text-gray-500">{tx.who || "—"}</td>
                    <td className={`py-3 px-4 text-right font-semibold tabular-nums ${tx.type === "revenue" ? "text-green-600" : "text-red-500"}`}>
                      {tx.type === "revenue" ? "+" : "-"} {formatCurrency(tx.value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        tx.type === "revenue"
                          ? "text-green-700 bg-green-50"
                          : "text-red-600 bg-red-50"
                      }`}>
                        {tx.type === "revenue" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs text-gray-500">{statusLabels[tx.status] || tx.status}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => router.push(`/transactions/new?edit=${tx.id}`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
