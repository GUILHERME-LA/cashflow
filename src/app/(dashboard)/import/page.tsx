"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { formatFileSize } from "@/lib/utils"

interface ParsedRow {
  date: string
  description: string
  value: number
  type: "revenue" | "expense"
  who?: string
  payment_method?: string
}

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const parseCSV = useCallback((text: string) => {
    const lines = text.split("\n").filter((l) => l.trim())
    if (lines.length < 2) {
      setError("Arquivo vazio ou sem dados")
      return
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const dateIdx = headers.findIndex((h) => h.includes("data") || h.includes("date"))
    const descIdx = headers.findIndex((h) => h.includes("descri") || h.includes("desc"))
    const valueIdx = headers.findIndex((h) => h.includes("valor") || h.includes("value"))
    const typeIdx = headers.findIndex((h) => h.includes("tipo") || h.includes("type"))
    const whoIdx = headers.findIndex((h) => h.includes("quem") || h.includes("who") || h.includes("pessoa"))

    if (descIdx === -1 || valueIdx === -1) {
      setError("Colunas obrigatórias não encontradas (descrição, valor)")
      return
    }

    const rows: ParsedRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""))
      const valueStr = cols[valueIdx]?.replace(/[R$\s.]/g, "").replace(",", ".")
      const value = parseFloat(valueStr)

      if (isNaN(value)) continue

      const typeStr = typeIdx >= 0 ? cols[typeIdx]?.toLowerCase() : ""
      let type: "revenue" | "expense" = "expense"
      if (typeStr.includes("receita") || typeStr.includes("revenue") || typeStr.includes("entrada")) {
        type = "revenue"
      }

      rows.push({
        date: cols[dateIdx] || new Date().toISOString().split("T")[0],
        description: cols[descIdx] || "Importado",
        value: Math.abs(value),
        type,
        who: whoIdx >= 0 ? cols[whoIdx] : undefined,
      })
    }

    setParsedData(rows)
    setError(null)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    setFile(f)
    setResult(null)
    setParsedData([])

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(f)
  }

  async function handleImport() {
    if (parsedData.length === 0) return
    setImporting(true)

    let success = 0
    let failed = 0

    for (const row of parsedData) {
      try {
        const { error: insertError } = await supabase.from("transactions").insert({
          type: row.type,
          date: row.date,
          description: row.description,
          value: row.value,
          who: row.who || null,
          payment_method: row.payment_method || "dinheiro",
          status: "pending",
        })
        if (insertError) throw insertError
        success++
      } catch {
        failed++
      }
    }

    setResult({ success, failed })
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Importar Dados</h2>
        <p className="text-sm text-gray-500 mt-1">Importe transações de planilhas CSV</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-300 transition-colors">
          <Upload size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-2">
            Arraste um arquivo CSV ou clique para selecionar
          </p>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-600 hover:file:bg-green-100"
          />
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText size={20} className="text-green-500" />
            <div className="flex-1">
              <p className="text-sm text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {parsedData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Preview ({parsedData.length} registros)
            </h3>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {importing ? "Importando..." : "Importar Tudo"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Data</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Descrição</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500">Quem</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-500">Valor</th>
                  <th className="text-center py-2 px-3 text-xs text-gray-500">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-900">{row.date}</td>
                    <td className="py-2 px-3 text-gray-900">{row.description}</td>
                    <td className="py-2 px-3 text-gray-500">{row.who || "—"}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${
                      row.type === "revenue" ? "text-green-600" : "text-red-500"
                    }`}>
                      R$ {row.value.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs ${
                        row.type === "revenue" ? "text-green-600" : "text-red-500"
                      }`}>
                        {row.type === "revenue" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 20 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                ... e mais {parsedData.length - 20} registros
              </p>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Resultado da Importação</h3>
          <div className="flex gap-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="text-sm">{result.success} importados</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle size={20} />
                  <span className="text-sm">{result.failed} falharam</span>
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
