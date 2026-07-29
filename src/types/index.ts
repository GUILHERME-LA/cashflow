export type TransactionType = "revenue" | "expense"
export type TransactionStatus = "pending" | "paid" | "received"
export type PaymentMethod =
  | "dinheiro"
  | "pix"
  | "cartao"
  | "boleto"
  | "transferencia"
  | "credito"
  | "debito"
export type AuditAction = "create" | "update" | "delete"

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  category_id: string | null
  type: TransactionType
  date: string
  description: string
  value: number
  who: string | null
  payment_method: PaymentMethod
  status: TransactionStatus
  notes: string | null
  proof_file_id: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  category?: Category
}

export interface ProofFile {
  id: string
  filename: string
  filepath: string
  mimetype: string
  size_bytes: number
  checksum: string | null
  transaction_id: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface AuditLogEntry {
  id: string
  action: AuditAction
  entity_type: string
  entity_id: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  performed_by: string | null
  ip_address: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface FinanceiroSummary {
  totalRevenue: number
  totalExpense: number
  balance: number
  revenueCount: number
  expenseCount: number
  periodLabel: string
}

export interface User {
  id: string
  email: string
  name?: string
}
