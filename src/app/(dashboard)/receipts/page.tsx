"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { FileText, Image, Download, Loader2, Eye } from "lucide-react"
import { formatFileSize, formatDateFull } from "@/lib/utils"
import type { ProofFile } from "@/types"

export default function ReceiptsPage() {
  const [files, setFiles] = useState<ProofFile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadFiles()
  }, [])

  async function loadFiles() {
    setLoading(true)
    const { data } = await supabase
      .from("proof_files")
      .select("*")
      .order("uploaded_at", { ascending: false })
    setFiles((data || []) as ProofFile[])
    setLoading(false)
  }

  function getFileIcon(mimetype: string) {
    if (mimetype.startsWith("image/")) return Image
    return FileText
  }

  function getPublicUrl(filepath: string) {
    const { data } = supabase.storage
      .from("cashflow-proofs")
      .getPublicUrl(filepath)
    return data.publicUrl
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Comprovantes</h2>
        <p className="text-sm text-gray-500 mt-1">Todos os arquivos anexados a transações</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin text-green-500" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 shadow-sm">
          <FileText size={40} className="mx-auto mb-4 text-gray-300" />
          Nenhum comprovante encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => {
            const Icon = getFileIcon(file.mimetype)
            const url = getPublicUrl(file.filepath)
            return (
              <div
                key={file.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-green-300 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 shrink-0">
                    <Icon size={20} className="text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{file.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size_bytes)} • {formatDateFull(file.uploaded_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Eye size={12} />
                    Ver
                  </a>
                  <a
                    href={url}
                    download={file.filename}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <Download size={12} />
                    Baixar
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
