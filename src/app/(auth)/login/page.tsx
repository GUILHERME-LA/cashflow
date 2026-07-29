"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, DollarSign, ShieldAlert } from "lucide-react"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get("error") === "no_access") {
      setError("Você não tem acesso a este sistema. Entre em contato com o administrador.")
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role_id, roles!inner(name)")
        .eq("user_id", data.user.id)

      const roles = (roleCheck as unknown as Array<{ roles: { name: string } }>) ?? []
      const roleNames = roles.map((r) => r.roles?.name).filter(Boolean)
      const hasAccess = roleNames.includes("admin") || roleNames.includes("cashflow_user")

      if (!hasAccess) {
        await supabase.auth.signOut()
        setError("Você não tem acesso a este sistema. Entre em contato com o administrador.")
        setLoading(false)
        return
      }
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500 mb-4">
            <DollarSign size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CashFlow</h1>
          <p className="text-sm text-gray-500 mt-1">Controle Financeiro</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          {error && (
            <div className={`border rounded-lg p-3 ${
              error.includes("não tem acesso")
                ? "bg-orange-50 border-orange-200"
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start gap-2">
                {error.includes("não tem acesso") && <ShieldAlert size={16} className="text-orange-500 mt-0.5 shrink-0" />}
                <p className={`text-sm ${error.includes("não tem acesso") ? "text-orange-600" : "text-red-600"}`}>
                  {error}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
