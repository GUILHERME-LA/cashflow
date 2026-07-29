"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Upload, FileText, CheckCircle, XCircle, Loader2, Trash2,
  Image, File, Pencil, X, Check, AlertTriangle,
} from "lucide-react"
import { formatFileSize, formatCurrency } from "@/lib/utils"
import { analyzeDocument, type AnalyzedItem } from "@/lib/document-analyzer"
import type { Category, PaymentMethod } from "@/types"

const ACCEPTED_TYPES = {
  "image/jpeg": "Imagem",
  "image/png": "Imagem",
  "image/webp": "Imagem",
  "image/heic": "Imagem",
  "application/pdf": "PDF",
  "text/csv": "CSV",
  "text/plain": "CSV",
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
]

interface ParsedRow extends AnalyzedItem {
  file?: File
  edited?: boolean
  status: "pending" | "imported" | "error"
  errorMsg?: string
}

export default function ImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 })
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<ParsedRow | null>(null)
  const supabase = createClient()

  const parseCSV = useCallback((text: string, file: File) => {
    const lines = text.split("\n").filter((l) => l.trim())
    if (lines.length < 2) {
      setError("Arquivo CSV vazio ou sem dados")
      return
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const dateIdx = headers.findIndex((h) => h.includes("data") || h.includes("date"))
    const descIdx = headers.findIndex((h) => h.includes("descri") || h.includes("desc") || h.includes("produto") || h.includes("item"))
    const valueIdx = headers.findIndex((h) => h.includes("valor") || h.includes("value") || h.includes("preco") || h.includes("preço") || h.includes("total"))
    const typeIdx = headers.findIndex((h) => h.includes("tipo") || h.includes("type") || h.includes("categoria"))
    const whoIdx = headers.findIndex((h) => h.includes("quem") || h.includes("who") || h.includes("pessoa") || h.includes("cliente") || h.includes("fornecedor"))

    if (descIdx === -1 || valueIdx === -1) {
      setError("Colunas obrigatórias não encontradas no CSV (descrição, valor)")
      return
    }

    const rows: ParsedRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""))
      const valueStr = cols[valueIdx]?.replace(/[R$\s.]/g, "").replace(",", ".")
      const value = parseFloat(valueStr)
      if (isNaN(value) || value <= 0) continue

      const typeStr = typeIdx >= 0 ? cols[typeIdx]?.toLowerCase() : ""
      let type: "revenue" | "expense" = "expense"
      if (typeStr.includes("receita") || typeStr.includes("revenue") || typeStr.includes("entrada")) {
        type = "revenue"
      }

      rows.push({
        date: cols[dateIdx] || new Date().toISOString().split("T")[0],
        description: cols[descIdx] || "Importado do CSV",
        value: Math.abs(value),
        type,
        who: whoIdx >= 0 ? cols[whoIdx] : "",
        suggested_category: "",
        confidence: 1,
        raw_text: "",
        file,
        status: "pending",
      })
    }

    setParsedData((prev) => [...prev, ...rows])
    setError(null)
  }, [])

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setError(null)
    setAnalyzing(true)
    setAnalyzeProgress({ current: 0, total: fileList.length })

    const newRows: ParsedRow[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      setAnalyzeProgress({ current: i + 1, total: fileList.length })

      try {
        if (file.type === "text/csv" || file.type === "text/plain" || file.name.endsWith(".csv")) {
          const text = await file.text()
          parseCSV(text, file)
          continue
        }

        if (ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
          const analyzed = await analyzeDocument(file)
          newRows.push({
            ...analyzed,
            file,
            status: "pending",
          })
        } else {
          setError((prev) => prev ? `${prev}\nTipo não suportado: ${file.name}` : `Tipo não suportado: ${file.name}`)
        }
      } catch (err) {
        console.error(`Erro ao analisar ${file.name}:`, err)
        newRows.push({
          date: new Date().toISOString().split("T")[0],
          description: `Erro ao analisar: ${file.name}`,
          value: 0,
          type: "expense",
          who: "",
          suggested_category: "Outra despesa",
          confidence: 0,
          raw_text: "",
          file,
          status: "error",
          errorMsg: err instanceof Error ? err.message : "Erro desconhecido",
        })
      }
    }

    setParsedData((prev) => [...prev, ...newRows])
    setAnalyzing(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeRow(idx: number) {
    setParsedData((prev) => prev.filter((_, i) => i !== idx))
  }

  function startEdit(idx: number) {
    setEditingIdx(idx)
    setEditForm({ ...parsedData[idx] })
  }

  function saveEdit() {
    if (editingIdx === null || !editForm) return
    setParsedData((prev) => prev.map((r, i) => i === editingIdx ? { ...editForm, edited: true } : r))
    setEditingIdx(null)
    setEditForm(null)
  }

  function cancelEdit() {
    setEditingIdx(null)
    setEditForm(null)
  }

  async function handleImport() {
    const validRows = parsedData.filter((r) => r.status === "pending" && r.value > 0)
    if (validRows.length === 0) {
      setError("Nenhum registro válido para importar")
      return
    }

    setImporting(true)
    let success = 0
    let failed = 0

    for (const row of validRows) {
      try {
        const txData: Record<string, unknown> = {
          type: row.type,
          date: row.date,
          description: row.description,
          value: row.value,
          who: row.who || null,
          payment_method: "dinheiro",
          status: "pending",
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) txData.created_by = user.id

        const { data: newTx, error: insertErr } = await supabase
          .from("transactions")
          .insert(txData)
          .select("id")
          .single()

        if (insertErr) throw insertErr

        if (row.file && newTx) {
          const ext = row.file.name.split(".").pop() || "bin"
          const fileName = `${crypto.randomUUID()}.${ext}`
          const filePath = `receipts/${fileName}`

          const { error: uploadErr } = await supabase.storage
            .from("financeiro-proofs")
            .upload(filePath, row.file, {
              contentType: row.file.type,
              cacheControl: "3600",
              upsert: false,
            })

          if (!uploadErr) {
            await supabase.from("proof_files").insert({
              filename: row.file.name,
              filepath: filePath,
              mimetype: row.file.type,
              size_bytes: row.file.size,
              transaction_id: newTx.id,
            })
          }
        }

        success++
        setParsedData((prev) => prev.map((r) =>
          r === row ? { ...r, status: "imported" as const } : r
        ))
      } catch (err) {
        console.error("Erro ao importar:", err)
        failed++
        const msg = err instanceof Error ? err.message : "Erro ao importar"
        setParsedData((prev) => prev.map((r) =>
          r === row ? { ...r, status: "error" as const, errorMsg: msg } : r
        ))
      }
    }

    setResult({ success, failed })
    setImporting(false)
  }

  const pendingCount = parsedData.filter((r) => r.status === "pending" && r.value > 0).length
  const importedCount = parsedData.filter((r) => r.status === "imported").length
  const errorCount = parsedData.filter((r) => r.status === "error").length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Importar Dados</h2>
        <p className="text-sm text-gray-500 mt-1">
          Importe comprovantes (imagens), notas fiscais (PDF) ou planilhas (CSV)
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-300 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-green-400", "bg-green-50") }}
          onDragLeave={(e) => { e.currentTarget.classList.remove("border-green-400", "bg-green-50") }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove("border-green-400", "bg-green-50")
            handleFiles(e.dataTransfer.files)
          }}
        >
          {analyzing ? (
            <div className="space-y-3">
              <Loader2 size={40} className="mx-auto text-green-500 animate-spin" />
              <p className="text-sm text-gray-600">
                Analisando documento {analyzeProgress.current}/{analyzeProgress.total}...
              </p>
              <p className="text-xs text-gray-400">Extraindo texto e identificando valores</p>
            </div>
          ) : (
            <>
              <Upload size={40} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 mb-1">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-400">
                Imagens (JPG, PNG, WebP), PDFs ou CSV
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.csv,.txt"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
            <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-red-600 mt-1">
              Limpar erro
            </button>
          </div>
        )}
      </div>

      {parsedData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Documentos Analisados ({parsedData.length})
              </h3>
              <div className="flex gap-3 mt-1">
                {pendingCount > 0 && (
                  <span className="text-xs text-gray-500">{pendingCount} pendente(s)</span>
                )}
                {importedCount > 0 && (
                  <span className="text-xs text-green-600">{importedCount} importado(s)</span>
                )}
                {errorCount > 0 && (
                  <span className="text-xs text-red-500">{errorCount} erro(s)</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setParsedData([])}
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              >
                Limpar Tudo
              </button>
              <button
                onClick={handleImport}
                disabled={importing || pendingCount === 0}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {importing ? "Importando..." : `Importar ${pendingCount} registro(s)`}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {parsedData.map((row, idx) => (
              <div
                key={idx}
                className={`border rounded-xl p-4 transition-colors ${
                  row.status === "imported"
                    ? "border-green-200 bg-green-50"
                    : row.status === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
              >
                {editingIdx === idx && editForm ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Editando</span>
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded">
                          <Check size={14} />
                        </button>
                        <button onClick={cancelEdit} className="p-1 text-red-500 hover:bg-red-100 rounded">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.value || ""}
                        onChange={(e) => setEditForm({ ...editForm, value: parseFloat(e.target.value) || 0 })}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        placeholder="Valor"
                      />
                      <input
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        placeholder="Descrição"
                      />
                      <input
                        value={editForm.who}
                        onChange={(e) => setEditForm({ ...editForm, who: e.target.value })}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        placeholder="Quem"
                      />
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as "revenue" | "expense" })}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      >
                        <option value="revenue">Receita</option>
                        <option value="expense">Despesa</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                      row.status === "imported"
                        ? "bg-green-100"
                        : row.status === "error"
                        ? "bg-red-100"
                        : row.type === "revenue"
                        ? "bg-green-50"
                        : "bg-red-50"
                    }`}>
                      {row.file?.type.startsWith("image/") ? (
                        <Image size={18} className={
                          row.status === "imported" ? "text-green-600" :
                          row.status === "error" ? "text-red-500" :
                          "text-gray-500"
                        } />
                      ) : row.file?.type === "application/pdf" ? (
                        <FileText size={18} className={
                          row.status === "imported" ? "text-green-600" :
                          row.status === "error" ? "text-red-500" :
                          "text-gray-500"
                        } />
                      ) : (
                        <File size={18} className="text-gray-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-900 truncate font-medium">{row.description}</p>
                        {row.status === "imported" && <CheckCircle size={14} className="text-green-500 shrink-0" />}
                        {row.status === "error" && <XCircle size={14} className="text-red-500 shrink-0" />}
                        {row.edited && <Pencil size={10} className="text-blue-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{row.date}</span>
                        {row.who && <span className="text-xs text-gray-400">• {row.who}</span>}
                        {row.suggested_category && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                            {row.suggested_category}
                          </span>
                        )}
                      </div>
                      {row.errorMsg && (
                        <p className="text-xs text-red-500 mt-1">{row.errorMsg}</p>
                      )}
                      {row.confidence < 0.5 && row.status === "pending" && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle size={10} className="text-orange-400" />
                          <span className="text-xs text-orange-400">Confiança baixa - verifique os dados</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${
                        row.type === "revenue" ? "text-green-600" : "text-red-500"
                      }`}>
                        {row.type === "revenue" ? "+" : "-"} {formatCurrency(row.value)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {row.type === "revenue" ? "Receita" : "Despesa"}
                      </p>
                    </div>

                    {row.status === "pending" && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(idx)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeRow(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {row.raw_text && row.status === "pending" && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                      Ver texto extraído
                    </summary>
                    <pre className="mt-1 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 max-h-24 overflow-auto whitespace-pre-wrap">
                      {row.raw_text}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Resultado da Importação</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} />
              <span className="text-sm font-medium">{result.success} importados</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle size={20} />
                <span className="text-sm font-medium">{result.failed} falharam</span>
              </div>
            )}
            <button
              onClick={() => router.push("/transactions")}
              className="ml-auto px-4 py-2 rounded-xl bg-green-500 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              Ver Transações
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
