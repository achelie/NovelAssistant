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

  if (node.type === 'paragraph' || node.type === 'heading') {
    return `${inner}\n\n`
  }

  if (node.type === 'doc') {
    return inner.trimEnd()
  }

  return inner
}

export function chapterContentToPlainText(raw: string | null | undefined): string {
  if (!raw) return ''
  const parsed = tryParseJson<PMJSON>(raw)
  if (parsed) return extractPlainTextFromPM(parsed)
  // 旧纯文本直接返回
  return raw
}

export function plainTextToMinimalDoc(text: string): PMJSON {
  const t = (text ?? '').trimEnd()
  if (!t) return { type: 'doc', content: [{ type: 'paragraph' }] }

  // 简单按空行分段，避免整章一段
  const paras = t
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean)

  return {
    type: 'doc',
    content: paras.map((p) => ({
      type: 'paragraph',
      content: p.split('\n').flatMap((line, idx) => {
        const nodes: PMJSON[] = []
        if (idx > 0) nodes.push({ type: 'hardBreak' })
        if (line.length > 0) nodes.push({ type: 'text', text: line })
        return nodes
      }),
    })),
  }
}
