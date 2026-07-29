export interface AnalyzedItem {
  date: string
  description: string
  value: number
  type: "revenue" | "expense"
  who: string
  suggested_category: string
  confidence: number
  raw_text: string
}

const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; type: "revenue" | "expense" }> = {
  "Serviço de carpintaria": { keywords: ["serviço", "servico", "montagem", "carpintaria", "marcenaria", "madeira", "moveis", "móveis", "rack", "armário", "armario", "prateleira", "mesa", "cadeira", "cama", "guarda-roupa", "cozinha"], type: "revenue" },
  "Venda de móveis": { keywords: ["venda", "vendido", "produto", "peça", "peca"], type: "revenue" },
  "Serviço de montagem": { keywords: ["montagem", "montar", "instalação", "instalacao", "instalar"], type: "revenue" },
  "Reparo e manutenção": { keywords: ["reparo", "manutenção", "manutencao", "conserto", "ajuste"], type: "revenue" },
  "Outra receita": { keywords: ["receita", "entrada", "pagamento recebido", "crédito", "credito"], type: "revenue" },
  "Materia-prima (madeira, MDF)": { keywords: ["madeira", "mdf", "compensado", "pinus", "eucalipto", "melamina", "fórmica", "formica", "tábua", "tubo", "ferro", "parafuso", "prego", "cola", "material"], type: "expense" },
  "Ferramentas": { keywords: ["ferramenta", "serra", "furadeira", "parafusadeira", "lixa", "broca", "formão", "pá", "machado"], type: "expense" },
  "Aluguel": { keywords: ["aluguel", "aluguel do galpão", "loja", "escritório", "escritorio", "sala"], type: "expense" },
  "Energia / água": { keywords: ["energia", "água", "agua", "luz", "conta de luz", "conta de agua", "sanitize"], type: "expense" },
  "Internet / Celular": { keywords: ["internet", "celular", "telefone", "wifi", "fibra", "sky", "vivo", "claro", "tim", "oi"], type: "expense" },
  "Transporte": { keywords: ["transporte", "frete", "combustível", "combustivel", "gasolina", "diesel", "etanol", "pedágio", "pedagio", "uber", "99"], type: "expense" },
  "Impostos / Taxas": { keywords: ["imposto", "taxa", "iss", "icms", "pis", "cofins", "simples", "darf", "guia", "tributo"], type: "expense" },
  "Mão de obra": { keywords: ["mão de obra", "mao de obra", "funcionário", "funcionario", "salário", "salario", "diária", "diaria", "trabalhador"], type: "expense" },
  "Tinta e acabamento": { keywords: ["tinta", "verniz", "selador", "massa", "pincel", "rolo", "acabamento", "pintura"], type: "expense" },
  "Outra despesa": { keywords: ["despesa", "saída", "saida", "gasto", "custo"], type: "expense" },
}

function extractDate(text: string): string {
  const today = new Date().toISOString().split("T")[0]

  const patterns = [
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/g,
    /(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})/g,
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/g,
  ]

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)]
    if (matches.length > 0) {
      const m = matches[0]
      if (m[3] && m[3].length === 4) {
        const day = m[1].padStart(2, "0")
        const month = m[2].padStart(2, "0")
        const year = m[3]
        const d = parseInt(day)
        const mo = parseInt(month)
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
          return `${year}-${month}-${day}`
        }
      }
      if (m[1] && m[1].length === 4) {
        return `${m[1]}-${m[2]}-${m[3]}`
      }
      if (m[3] && m[3].length === 2) {
        const year = parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`
        return `${year}-${m[2]}-${m[1]}`
      }
    }
  }

  const monthMap: Record<string, string> = {
    janeiro: "01", fevereiro: "02", março: "03", marco: "03",
    abril: "04", maio: "05", junho: "06", julho: "07",
    agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
  }
  const textLower = text.toLowerCase()
  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    const re = new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?${monthName}(?:\\s*(?:de\\s*)?(\\d{2,4}))?`, "i")
    const match = textLower.match(re)
    if (match) {
      const day = match[1].padStart(2, "0")
      let year = match[2]
      if (!year) year = new Date().getFullYear().toString()
      else if (year.length === 2) year = parseInt(year) > 50 ? `19${year}` : `20${year}`
      const d = parseInt(day)
      const mo = parseInt(monthNum)
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
        return `${year}-${monthNum}-${day}`
      }
    }
  }

  return today
}

function extractValue(text: string): number {
  const patterns = [
    /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g,
    /R\$\s*(\d+,\d{2})/g,
    /(\d{1,3}(?:\.\d{3})*,\d{2})/g,
    /total[:\s]*(\d+[.,]\d{2})/gi,
    /valor[:\s]*(\d+[.,]\d{2})/gi,
    /pagar[:\s]*(\d+[.,]\d{2})/gi,
  ]

  const values: number[] = []

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)]
    for (const match of matches) {
      const raw = match[1] || match[0]
      const cleaned = raw.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".")
      const num = parseFloat(cleaned)
      if (!isNaN(num) && num > 0 && num < 1000000) {
        values.push(num)
      }
    }
  }

  if (values.length === 0) return 0

  if (values.length >= 2) {
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    if (maxVal > minVal * 1.5) return maxVal
  }

  return Math.max(...values)
}

function extractDescription(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 2)
  const skipPatterns = [
    /^cnpj/i, /^cpf/i, /^inscri/i, /^nota fiscal/i, /^n[°º]/i,
    /^data/i, /^hora/i, /^ticket/i, /^cupom/i, /^nf/i,
    /^\d+$/, /^[\/\-\.\s]+$/, /^total/i, /^subtotal/i,
    /^desconto/i, /^acréscimo/i, /^troco/i, /^cartão/i,
    /^operador/i, /^caixa/i, /^sat/i, /^ecf/i,
  ]

  for (const line of lines) {
    if (line.length < 5 || line.length > 120) continue
    if (skipPatterns.some((p) => p.test(line))) continue
    if (/^\d+\s*[xX]\s*/.test(line)) {
      const desc = line.replace(/^\d+\s*[xX]\s*/, "").trim()
      if (desc.length >= 3) return desc.substring(0, 80)
    }
    return line.substring(0, 80)
  }

  return lines[0]?.substring(0, 80) || "Documento importado"
}

function extractWho(text: string): string {
  const patterns = [
    /(?: cliente|fornecedor|vendedor|comprador|emitente|destinatário|razão social|razao social)[:\s]*(.+?)(?:\n|$)/gi,
    /(?:cnpj|cpf)\s*(?:do\s*(?:cliente|fornecedor))?\s*[:\.]?\s*[\d\.\-\/]+[\s\-]*(.+?)(?:\n|$)/gi,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const who = match[1].trim().replace(/[^a-zA-ZÀ-ÿ\s]/g, "").trim()
      if (who.length >= 3 && who.length <= 60) return who
    }
  }

  const textLower = text.toLowerCase()
  if (textLower.includes("nota fiscal") || textLower.includes("nf-e") || textLower.includes("nfe")) {
    return "NF-e"
  }

  return ""
}

function detectType(text: string): "revenue" | "expense" {
  const textLower = text.toLowerCase()

  const expenseIndicators = [
    "nota fiscal", "nf-e", "nfe", "compra", "aquisição", "aquisicao",
    "despesa", "pagamento", "boleto", "fatura", "conta",
  ]
  const revenueIndicators = [
    "recebimento", "venda", "receita", "crédito", "credito",
    "pagamento recebido", "pix recebido",
  ]

  let expenseScore = 0
  let revenueScore = 0

  for (const word of expenseIndicators) {
    if (textLower.includes(word)) expenseScore++
  }
  for (const word of revenueIndicators) {
    if (textLower.includes(word)) revenueScore++
  }

  if (textLower.includes("nota fiscal de venda") || textLower.includes("nfv")) revenueScore += 2

  return revenueScore > expenseScore ? "revenue" : "expense"
}

function suggestCategory(text: string, type: "revenue" | "expense"): string {
  const textLower = text.toLowerCase()

  let bestMatch = ""
  let bestScore = 0

  for (const [category, config] of Object.entries(CATEGORY_KEYWORDS)) {
    if (config.type !== type) continue
    let score = 0
    for (const keyword of config.keywords) {
      if (textLower.includes(keyword)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = category
    }
  }

  if (bestMatch) return bestMatch

  return type === "revenue" ? "Outra receita" : "Outra despesa"
}

export async function analyzeImage(file: File): Promise<AnalyzedItem> {
  const Tesseract = (await import("tesseract.js")).default

  const imageData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const { data } = await Tesseract.recognize(imageData, "por", {
    logger: () => {},
  })

  const text = data.text
  const value = extractValue(text)
  const type = detectType(text)

  return {
    date: extractDate(text),
    description: extractDescription(text),
    value,
    type,
    who: extractWho(text),
    suggested_category: suggestCategory(text, type),
    confidence: data.confidence / 100,
    raw_text: text.substring(0, 500),
  }
}

export async function analyzePDF(file: File): Promise<AnalyzedItem> {
  const pdfjsLib = await import("pdfjs-dist")
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ""

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    fullText += pageText + "\n"
  }

  const value = extractValue(fullText)
  const type = detectType(fullText)

  return {
    date: extractDate(fullText),
    description: extractDescription(fullText),
    value,
    type,
    who: extractWho(fullText),
    suggested_category: suggestCategory(fullText, type),
    confidence: 0.7,
    raw_text: fullText.substring(0, 500),
  }
}

export async function analyzeDocument(file: File): Promise<AnalyzedItem> {
  if (file.type.startsWith("image/")) {
    return analyzeImage(file)
  }
  if (file.type === "application/pdf") {
    return analyzePDF(file)
  }
  throw new Error(`Tipo de arquivo não suportado: ${file.type}`)
}
