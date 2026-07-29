"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react"
import type { Category } from "@/types"

const defaultColors = [
  "#16a34a", "#22c55e", "#4ade80", "#86efac",
  "#dc2626", "#f97316", "#f59e0b", "#fbbf24",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6366f1",
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "revenue" | "expense",
    color: defaultColors[0],
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("type")
      .order("name")
    setCategories((data || []) as Category[])
    setLoading(false)
  }

  function openNew() {
    setEditCategory(null)
    setFormData({ name: "", type: "expense", color: defaultColors[0] })
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setEditCategory(cat)
    setFormData({ name: cat.name, type: cat.type, color: cat.color })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (editCategory) {
        await supabase
          .from("categories")
          .update({ name: formData.name, type: formData.type, color: formData.color })
          .eq("id", editCategory.id)
      } else {
        await supabase.from("categories").insert({
          name: formData.name,
          type: formData.type,
          color: formData.color,
        })
      }
      setShowForm(false)
      await loadCategories()
    } catch (err) {
      console.error("Erro:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Excluir "${cat.name}"?`)) return
    await supabase.from("categories").delete().eq("id", cat.id)
    await loadCategories()
  }

  const revenueCategories = categories.filter((c) => c.type === "revenue")
  const expenseCategories = categories.filter((c) => c.type === "expense")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categorias</h2>
          <p className="text-sm text-gray-500 mt-1">Organize suas receitas e despesas</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
        >
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {editCategory ? "Editar Categoria" : "Nova Categoria"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-900">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as "revenue" | "expense" }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                >
                  <option value="revenue">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-lg transition-transform ${
                      formData.color === color ? "scale-110 ring-2 ring-gray-900" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-green-500 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-green-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-green-600 mb-3">Receitas</h3>
            {revenueCategories.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria</p>
            ) : (
              <div className="space-y-2">
                {revenueCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm text-gray-900">{cat.name}</span>
                    <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-green-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(cat)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-red-500 mb-3">Despesas</h3>
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria</p>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm text-gray-900">{cat.name}</span>
                    <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-green-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(cat)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
