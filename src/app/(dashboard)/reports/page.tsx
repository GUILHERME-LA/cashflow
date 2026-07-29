"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Download, Loader2, Calendar } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Transaction } from "@/types"

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from("transactions")
      .select("*, category:categories(name, type, color)")
      .order("date", { ascending: false })

    if (startDate) query = query.gte("date", startDate)
    if (endDate) query = query.lte("date", endDate)
    if (filterType !== "all") query = query.eq("type", filterType)

    const { data } = await query
    setTransactions((data || []) as Transaction[])
    setLoading(false)
  }

  function handleFilter() {
    loadData()
  }

  function exportCSV() {
    const headers = ["Data", "Descrição", "Quem", "Valor", "Tipo", "Status", "Categoria", "Forma Pagamento"]
    const rows = transactions.map((tx) => [
      tx.date,
      tx.description,
      tx.who || "",
      tx.value.toFixed(2),
      tx.type === "revenue" ? "Receita" : "Despesa",
      tx.status,
      tx.category?.name || "",
      tx.payment_method,
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalRevenue = transactions
    .filter((t) => t.type === "revenue")
    .reduce((acc, t) => acc + t.value, 0)
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.value, 0)
  const balance = totalRevenue - totalExpense

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
          <p className="text-sm text-gray-500 mt-1">Filtre e exporte seus dados</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700"
              placeholder="Data início"
            />
          </div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700"
            placeholder="Data fim"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700"
          >
            <option value="all">Todos</option>
            <option value="revenue">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <button
            onClick={handleFilter}
            className="px-4 py-2 rounded-lg bg-green-500 text-sm font-semibold text-white hover:bg-green-600"
          >
            Filtrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Receitas</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Despesas</p>
          <p className="text-xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-green-600" : "text-orange-500"}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-green-500" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs text-gray-500">Data</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500">Descrição</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500">Categoria</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500">Valor</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900">{formatDate(tx.date)}</td>
                    <td className="py-3 px-4 text-gray-900">{tx.description}</td>
                    <td className="py-3 px-4 text-gray-500">{tx.category?.name || "—"}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      tx.type === "revenue" ? "text-green-600" : "text-red-500"
                    }`}>
                      {tx.type === "revenue" ? "+" : "-"} {formatCurrency(tx.value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs ${
                        tx.type === "revenue" ? "text-green-600" : "text-red-500"
                      }`}>
                        {tx.type === "revenue" ? "Receita" : "Despesa"}
                      </span>
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
