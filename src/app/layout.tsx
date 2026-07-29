import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "CashFlow - Controle Financeiro",
  description: "Sistema de controle financeiro para empresas",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
