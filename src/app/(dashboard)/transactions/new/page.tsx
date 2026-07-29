"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Loader2, Check } from "lucide-react"
import type { Category, PaymentMethod } from "@/types"

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
]

export default function NewTransactionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    }>
      <NewTransactionForm />
    </Suspense>
  )
}

function NewTransactionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())
  const mountedRef = useRef(true)

  const [formData, setFormData] = useState({
    type: "expense" as "revenue" | "expense",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    value: "",
    who: "",
    payment_method: "dinheiro" as PaymentMethod,
    notes: "",
  })

  useEffect(() => {
    mountedRef.current = true
    const supabase = supabaseRef.current

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && mountedRef.current) setUserId(user.id)

        const { data: cats } = await supabase
          .from("categories")
          .select("*")
          .eq("active", true)
          .order("name")
        if (mountedRef.current) setCategories((cats || []) as Category[])

        if (editId) {
          const { data: tx } = await supabase
            .from("transactions")
            .select("*")
            .eq("id", editId)
            .single()
          if (tx && mountedRef.current) {
            setFormData({
              type: tx.type,
              category_id: tx.category_id || "",
              date: tx.date,
              description: tx.description,
              value: tx.value.toString(),
              who: tx.who || "",
              payment_method: tx.payment_method,
              notes: tx.notes || "",
            })
          }
        }
      } catch (err) {
        console.error("Erro:", err)
        if (mountedRef.current) setError("Erro ao carregar dados")
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
    load()

    return () => { mountedRef.current = false }
  }, [editId])

  const filteredCategories = categories.filter((c) => c.type === formData.type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const description = formData.description.trim()
      if (!description) {
        setError("Descrição é obrigatória")
        setSaving(false)
        return
      }

      const value = parseFloat(formData.value)
      if (isNaN(value) || value <= 0) {
        setError("Valor deve ser maior que zero")
        setSaving(false)
        return
      }

      if (value > 99999999.99) {
        setError("Valor máximo é R$ 99.999.999,99")
        setSaving(false)
        return
      }

      if (!formData.date) {
        setError("Data é obrigatória")
        setSaving(false)
        return
      }

      const txData: Record<string, unknown> = {
        type: formData.type,
        category_id: formData.category_id || null,
        date: formData.date,
        description,
        value,
        who: formData.who.trim() || null,
        payment_method: formData.payment_method,
        notes: formData.notes.trim() || null,
      }

      if (!editId) {
        txData.status = "pending"
        if (userId) txData.created_by = userId
      } else {
        if (userId) txData.updated_by = userId
      }

      const supabase = supabaseRef.current
      let txId = editId

      if (editId) {
        const { error: updateError } = await supabase
          .from("transactions")
          .update(txData)
          .eq("id", editId)
        if (updateError) throw updateError
      } else {
        const { data: newTx, error: insertError } = await supabase
          .from("transactions")
          .insert(txData)
          .select()
          .single()
        if (insertError) throw insertError
        txId = newTx.id
      }

      if (file && txId) {
        const ext = file.name.split(".").pop() || "bin"
        const fileName = `${crypto.randomUUID()}.${ext}`
        const filePath = `receipts/${fileName}`

        const { error: uploadErr } = await supabase.storage
          .from("cashflow-proofs")
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          })

        if (!uploadErr) {
          await supabase.from("proof_files").insert({
            filename: file.name,
            filepath: filePath,
            mimetype: file.type,
            size_bytes: file.size,
            transaction_id: txId,
          })
        }
      }

      if (mountedRef.current) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/transactions")
          router.refresh()
        }, 800)
      }
    } catch (err) {
      console.error("Erro ao salvar:", err)
      if (mountedRef.current) {
        if (err && typeof err === "object" && "message" in err) {
          setError(String((err as { message: string }).message))
        } else {
          setError("Erro ao salvar. Verifique os dados e tente novamente.")
        }
      }
    } finally {
      if (mountedRef.current) setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {editId ? "Alterações salvas!" : "Lançamento criado!"}
          </p>
          <p className="text-sm text-gray-500 mt-1">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/transactions")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {editId ? "Editar Lançamento" : "Novo Lançamento"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {editId ? "Altere os dados da movimentação" : "Adicione uma nova receita ou despesa"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
            <div className="flex gap-2">
              {["revenue", "expense"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, type: t as "revenue" | "expense", category_id: "" }))}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    formData.type === t
                      ? t === "revenue"
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                      : "bg-gray-50 border border-gray-200 text-gray-500"
                  }`}
                >
                  {t === "revenue" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Data</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoria</label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500"
          >
            <option value="">Selecione a categoria</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {filteredCategories.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Nenhuma categoria para este tipo</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Descrição *</label>
            <input
              placeholder="Ex: Venda de mesa, Compra de madeira..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500"
              required
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="99999999.99"
              placeholder="0,00"
              value={formData.value}
              onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Quem (pagou/recebeu)</label>
            <input
              placeholder="Nome do cliente ou fornecedor"
              value={formData.who}
              onChange={(e) => setFormData((prev) => ({ ...prev, who: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Forma de Pagamento</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500"
            >
              {paymentMethods.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Observações</label>
          <textarea
            placeholder="Detalhes adicionais..."
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500 resize-none"
          />
        </div>

        {!editId && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Comprovante (opcional)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-600 hover:file:bg-green-100"
            />
            {file && (
              <p className="text-xs text-gray-400 mt-1">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/transactions")}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-green-500 text-sm font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? "Salvando..." : editId ? "Salvar Alterações" : "Salvar Lançamento"}
          </button>
        </div>
      </form>
    </div>
  )
}
