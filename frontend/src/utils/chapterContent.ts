export type PMJSON = {
  type?: string
  text?: string
  content?: PMJSON[]
  attrs?: Record<string, unknown>
}

export function tryParseJson<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function isProseMirrorJsonString(raw: string | null | undefined): boolean {
  if (!raw) return false
  const j = tryParseJson<PMJSON>(raw)
  return !!j && typeof j === 'object' && (j.type === 'doc' || Array.isArray(j.content))
}

export function extractPlainTextFromPM(node: PMJSON | null | undefined): string {
  if (!node) return ''

  if (node.type === 'hardBreak') return '\n'

  if (typeof node.text === 'string') return node.text

  const children = node.content ?? []
  if (!Array.isArray(children) || children.length === 0) return ''

  const inner = children.map(extractPlainTextFromPM).join('')

  return inner
}

/**
 * 可读文本（带段落分隔）。仅用于展示，不要用于字数统计。
 */
export function extractReadableTextFromPM(node: PMJSON | null | undefined): string {
  if (!node) return ''

  if (node.type === 'hardBreak') return '\n'

  if (typeof node.text === 'string') return node.text

  const children = node.content ?? []
  if (!Array.isArray(children) || children.length === 0) return ''

  const inner = children.map(extractReadableTextFromPM).join('')

  if (node.type === 'paragraph' || node.type === 'heading') {
    return `${inner}\n\n`
  }

  if (node.type === 'doc') {
    return inner.trimEnd()
  }

  return inner
}

export function isPMJSON(value: unknown): value is PMJSON {
  if (!value || typeof value !== 'object') return false
  const v = value as PMJSON
  return v.type === 'doc' && Array.isArray(v.content)
}

export function chapterContentToPlainText(raw: string | null | undefined): string {
  if (!raw) return ''
  const parsed = tryParseJson<unknown>(raw)
  if (isPMJSON(parsed)) return extractPlainTextFromPM(parsed).trimEnd()
  // 旧纯文本直接返回
  return raw.trimEnd()
}

export function plainTextToMinimalDoc(text: string): PMJSON {
  // 统一换行符，避免 Windows \r\n 导致“空行分段”失效
  const t = (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd()
  if (!t) return { type: 'doc', content: [{ type: 'paragraph' }] }

  // 逐行解析，保留“空白段落”（空行在富文本里应表现为一个空 paragraph 节点）
  // 这样保存/编辑后不会把“空一行”的段落间距吃掉。
  const lines = t.split('\n')
  const paras: Array<{ lines: string[]; empty?: boolean }> = []
  let cur: string[] = []

  const flush = () => {
    if (cur.length > 0) {
      paras.push({ lines: cur })
      cur = []
    }
  }

  for (const line of lines) {
    if (line.trim() === '') {
      flush()
      paras.push({ lines: [], empty: true })
      continue
    }
    cur.push(line)
  }
  flush()

  return {
    type: 'doc',
    content: paras.map((p) => {
      if (p.empty) return { type: 'paragraph' } as PMJSON
      return {
        type: 'paragraph',
        content: p.lines.flatMap((line, idx) => {
          const nodes: PMJSON[] = []
          if (idx > 0) nodes.push({ type: 'hardBreak' })
          if (line.length > 0) nodes.push({ type: 'text', text: line })
          return nodes
        }),
      } as PMJSON
    }),
  }
}
