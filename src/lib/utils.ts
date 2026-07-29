import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const parts = dateStr.split("-")
  if (parts.length !== 3) return dateStr
  const [y, m, d] = parts
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString("pt-BR") + " " +
      date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return dateStr
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}
