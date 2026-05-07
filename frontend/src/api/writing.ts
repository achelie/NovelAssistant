import request, { getToken } from './request'
import type { ApiResult, WritingPromptPreview, WritingRequest } from '../types'

export function previewWritingPrompt(data: WritingRequest) {
  return request.post<any, ApiResult<WritingPromptPreview>>('/writing/preview-prompt', data)
}

/**
 * 调用后端流式续写（SSE / data 行），将解析出的文本片段依次交给 onToken。
 */
export async function consumeWritingGenerateStream(
  data: WritingRequest,
  onToken: (chunk: string) => void,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const auth = getToken()
  const res = await fetch('/api/writing/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify(data),
    signal: opts?.signal,
  })

  if (res.status === 401) {
    // 避免“旧会话的 401”把新登录的 token 清掉
    if (!auth || getToken() === auth) {
      localStorage.removeItem('novel_assistant_token')
      window.location.href = '/login'
    }
    throw new Error('登录已过期，请重新登录')
  }

  if (!res.ok) {
    let msg = `续写请求失败 (${res.status})`
    try {
      const t = await res.text()
      if (t) {
        try {
          const j = JSON.parse(t) as { message?: string }
          msg = j.message || t.slice(0, 300)
        } catch {
          msg = t.slice(0, 300)
        }
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error('当前环境不支持读取流式响应')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  const emitPayload = (raw: string) => {
    // 不要 trimEnd：模型可能会以 token 形式输出换行符（\n），trim 会导致分段丢失
    const s = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (s === '' || s === '[DONE]') return
    if (s.startsWith('{')) {
      try {
        const j = JSON.parse(s) as { choices?: Array<{ delta?: { content?: string } }> }
        const c = j.choices?.[0]?.delta?.content
        if (typeof c === 'string' && c.length > 0) {
          onToken(c)
          return
        }
      } catch {
        /* 非 JSON 则整段作为正文 */
      }
    }
    onToken(s)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    for (;;) {
      const sep = buffer.indexOf('\n\n')
      if (sep < 0) break
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const lines = block.split('\n')
      const dataLines: string[] = []
      for (const line of lines) {
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        }
      }
      if (dataLines.length > 0) {
        // SSE 允许一个 event 有多行 data:，这些行之间应保留换行
        emitPayload(dataLines.join('\n'))
      } else if (block.trim()) {
        emitPayload(block)
      }
    }
  }

  if (buffer.trim()) {
    const lines = buffer.split('\n')
    const dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      else if (line.trim()) emitPayload(line)
    }
    if (dataLines.length > 0) emitPayload(dataLines.join('\n'))
  }
}
