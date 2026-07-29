"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { TrendingUp, TrendingDown, ArrowUpDown, Loader2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Transaction, FinanceiroSummary } from "@/types"

export default function DashboardPage() {
  const [summary, setSummary] = useState<FinanceiroSummary>({
    totalRevenue: 0,
    totalExpense: 0,
    balance: 0,
    revenueCount: 0,
    expenseCount: 0,
    periodLabel: "Todos os períodos",
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [txResult, summaryResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, category:categories(name, type, color)")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("transactions").select("type, value"),
      ])

      if (txResult.error) throw txResult.error
      if (summaryResult.error) throw summaryResult.error

      setRecentTransactions((txResult.data || []) as Transaction[])

      const txs = (summaryResult.data || []) as Pick<Transaction, "type" | "value">[]
      const totalRevenue = txs
        .filter((t) => t.type === "revenue")
        .reduce((acc, t) => acc + (Number(t.value) || 0), 0)
      const totalExpense = txs
        .filter((t) => t.type === "expense")
        .reduce((acc, t) => acc + (Number(t.value) || 0), 0)

      setSummary({
        totalRevenue,
        totalExpense,
        balance: totalRevenue - totalExpense,
        revenueCount: txs.filter((t) => t.type === "revenue").length,
        expenseCount: txs.filter((t) => t.type === "expense").length,
        periodLabel: "Todos os períodos",
      })
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const stats = [
    {
      label: "Receitas",
      value: summary.totalRevenue,
      count: summary.revenueCount,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Despesas",
      value: summary.totalExpense,
      count: summary.expenseCount,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Saldo",
      value: summary.balance,
      count: null,
      icon: ArrowUpDown,
      color: summary.balance >= 0 ? "text-green-600" : "text-orange-500",
      bg: summary.balance >= 0 ? "bg-green-50" : "bg-orange-50",
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Visão geral das finanças</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stat.value)}
                </p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
            {stat.count !== null && (
              <p className="text-xs text-gray-500 mt-3">{stat.count} lançamentos</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Últimas Movimentações</h3>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma transação encontrada
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white text-xs font-bold"
                  style={{ backgroundColor: tx.category?.color || "#16a34a" }}
                >
                  {tx.type === "revenue" ? "+" : "-"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-500">
                    {tx.who || "Sem destinatário"} • {formatDate(tx.date)}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    tx.type === "revenue" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {tx.type === "revenue" ? "+" : "-"} {formatCurrency(Number(tx.value) || 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
