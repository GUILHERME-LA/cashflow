"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, DollarSign, TrendingUp, Shield, BarChart3 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500">
            <DollarSign size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">CashFlow</span>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
        >
          Entrar
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-600 text-sm font-medium mb-6">
            <DollarSign size={16} />
            Controle Financeiro Inteligente
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
            Gerencie suas{" "}
            <span className="text-green-500">finanças</span>{" "}
            com simplicidade
          </h1>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            Controle completo de receitas e despesas. Importe dados, acompanhe comprovantes
            e tenha relatórios detalhados de tudo que entra e sai do seu negócio.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-green-500 text-white text-lg font-semibold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/25"
          >
            Acessar
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 mb-4">
              <TrendingUp size={24} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Controle Total</h3>
            <p className="text-sm text-gray-500">
              Registre cada receita e despesa com detalhes. Saiba exatamente para onde seu dinheiro vai.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 mb-4">
              <BarChart3 size={24} className="text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Relatórios</h3>
            <p className="text-sm text-gray-500">
              Visualize gráficos, exporte CSV e tenha visão completa das suas finanças por período.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 mb-4">
              <Shield size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Auditoria</h3>
            <p className="text-sm text-gray-500">
              Histórico completo de todas as ações. Tudo que for feito fica registrado para consulta.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-400">
          CashFlow © 2026 — Controle Financeiro
        </div>
      </footer>
    </div>
  )
}
