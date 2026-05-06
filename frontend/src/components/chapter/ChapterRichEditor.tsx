import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useMemo, useRef } from 'react'

import { plainTextToMinimalDoc, type PMJSON, tryParseJson } from '../../utils/chapterContent'

export type ChapterRichEditorChange = {
  jsonString: string
  plainText: string
}

export type ChapterRichEditorProps = {
  initialContent?: string | null
  onChange?: (payload: ChapterRichEditorChange) => void
  className?: string
}

function toDoc(raw: string | null | undefined): PMJSON {
  const r = raw ?? ''
  const trimmed = r.trim()
  if (!trimmed) return { type: 'doc', content: [{ type: 'paragraph' }] }

  const parsed = tryParseJson<unknown>(trimmed)
  if (parsed && typeof parsed === 'object') {
    const pm = parsed as PMJSON
    if (pm.type === 'doc' && Array.isArray(pm.content)) return pm
  }

  return plainTextToMinimalDoc(r)
}

export function ChapterRichEditor({ initialContent, onChange, className }: ChapterRichEditorProps) {
  const initialDoc = useMemo(() => toDoc(initialContent), [initialContent])
  const lastAppliedDocStringRef = useRef<string>(JSON.stringify(initialDoc))
  const lastInteractionRef = useRef<'mouse' | 'keyboard' | 'programmatic'>('programmatic')
  const clickScrollRestoreRef = useRef<{ el: HTMLElement; top: number } | null>(null)

  const captureScrollForRestore = (startEl: HTMLElement) => {
    let el: HTMLElement | null = startEl
    while (el) {
      const style = window.getComputedStyle(el)
      const overflowY = style.overflowY
      const canScrollY =
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
        el.scrollHeight > el.clientHeight + 1
      if (canScrollY) {
        clickScrollRestoreRef.current = { el, top: el.scrollTop }
        return
      }
      el = el.parentElement
    }
    clickScrollRestoreRef.current = null
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
    ],
    content: initialDoc,
    editorProps: {
      attributes: {
        class:
          'min-h-[240px] px-4 py-3 focus:outline-none whitespace-pre-wrap break-words',
      },
      handleKeyDown() {
        lastInteractionRef.current = 'keyboard'
        return false
      },
      handleDOMEvents: {
        mousedown(view) {
          lastInteractionRef.current = 'mouse'
          captureScrollForRestore(view.dom as HTMLElement)
          return false
        },
      },
      // 点击编辑器“空白区域”（例如 min-height 留出来的空白）时，
      // ProseMirror 默认会把光标放到文末，可能导致父容器滚动到底部。
      // 这里拦截这种点击：只聚焦，不改变选区，从而避免滚动跳动。
      handleClick(view, _pos, event) {
        lastInteractionRef.current = 'mouse'
        const e = event as MouseEvent

        // 注意：点在编辑器底部留白时，posAtCoords 依然可能返回“文末位置”，
        // 导致选区跳到最后一行并触发滚动。这里用“是否点在最后一行下面”来判定留白点击。
        const endPos = view.state.doc.content.size
        const endCoords = view.coordsAtPos(endPos)
        const isBelowLastLine = e.clientY > endCoords.bottom + 2
        if (!isBelowLastLine) {
          // 正常点击文本时，也不要让任何“自动滚动到选区”的行为改变滚动位置
          requestAnimationFrame(() => {
            const snap = clickScrollRestoreRef.current
            if (snap) snap.el.scrollTop = snap.top
          })
          return false
        }

        requestAnimationFrame(() => {
          lastInteractionRef.current = 'programmatic'
          editor?.commands.focus(undefined, { scrollIntoView: false })
          const snap = clickScrollRestoreRef.current
          if (snap) snap.el.scrollTop = snap.top
        })
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.({
        jsonString: JSON.stringify(editor.getJSON()),
        plainText: editor.getText(),
      })
    },
  })

  useEffect(() => {
    if (!editor) return

    const nextDoc = toDoc(initialContent)
    const nextDocString = JSON.stringify(nextDoc)
    const currentDocString = JSON.stringify(editor.getJSON())
    if (nextDocString === currentDocString) return
    if (nextDocString === lastAppliedDocStringRef.current) return

    const wasFocused = editor.isFocused
    editor.commands.setContent(nextDoc, { emitUpdate: false })
    lastAppliedDocStringRef.current = nextDocString

    if (wasFocused) {
      requestAnimationFrame(() => {
        lastInteractionRef.current = 'programmatic'
        editor.commands.focus(undefined, { scrollIntoView: false })
      })
    }
  }, [editor, initialContent])

  const toolbarBtnBase =
    'inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors'
  const toolbarBtnIdle = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  const toolbarBtnActive = 'border-slate-300 bg-slate-100 text-slate-900'
  const toolbarBtnDisabled = 'cursor-not-allowed opacity-50'

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          className={[
            toolbarBtnBase,
            editor?.isActive('heading', { level: 1 }) ? toolbarBtnActive : toolbarBtnIdle,
            !editor ? toolbarBtnDisabled : '',
          ].join(' ')}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!editor}
        >
          H1
        </button>
        <button
          type="button"
          className={[
            toolbarBtnBase,
            editor?.isActive('heading', { level: 2 }) ? toolbarBtnActive : toolbarBtnIdle,
            !editor ? toolbarBtnDisabled : '',
          ].join(' ')}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor}
        >
          H2
        </button>

        <div className="mx-1 w-px self-stretch bg-slate-200" />

        <button
          type="button"
          className={[
            toolbarBtnBase,
            editor?.isActive('bold') ? toolbarBtnActive : toolbarBtnIdle,
            !editor ? toolbarBtnDisabled : '',
          ].join(' ')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={!editor || !editor.can().chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </button>
        <button
          type="button"
          className={[
            toolbarBtnBase,
            editor?.isActive('italic') ? toolbarBtnActive : toolbarBtnIdle,
            !editor ? toolbarBtnDisabled : '',
          ].join(' ')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={!editor || !editor.can().chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </button>

        <div className="mx-1 w-px self-stretch bg-slate-200" />

        <button
          type="button"
          className={[
            toolbarBtnBase,
            toolbarBtnIdle,
            !editor ? toolbarBtnDisabled : '',
          ].join(' ')}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          disabled={!editor}
        >
          分割线
        </button>
      </div>

      <div className="rounded-b-lg border border-slate-200 bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

