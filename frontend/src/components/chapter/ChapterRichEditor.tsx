import { Extension } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Plugin, TextSelection } from 'prosemirror-state'
import { useEffect, useMemo, useRef } from 'react'

import { plainTextToMinimalDoc, type PMJSON, tryParseJson } from '../../utils/chapterContent'

let lastInteractionGlobal: 'mouse' | 'keyboard' | 'programmatic' = 'programmatic'
let lastEditorMouseDownAt = 0

const PreventMouseAppendEmptyParagraph = Extension.create({
  name: 'preventMouseAppendEmptyParagraph',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (tr, state) => {
          if (!tr.docChanged) return true
          if (lastInteractionGlobal !== 'mouse') return true
          if (Date.now() - lastEditorMouseDownAt > 250) return true

          const before = state.doc
          const after = tr.doc

          // 点击编辑器不应该改变文本内容。这里阻止“文本不变但结构变化”的事务（常见为自动补段落）。
          const beforeText = before.textBetween(0, before.content.size, '\n', '\n')
          const afterText = after.textBetween(0, after.content.size, '\n', '\n')
          if (beforeText === afterText) {
            return false
          }

          return true
        },
      }),
    ]
  },
})

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
      PreventMouseAppendEmptyParagraph,
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
        lastInteractionGlobal = 'keyboard'
        return false
      },
      handleDOMEvents: {
        mousedown(view) {
          lastInteractionRef.current = 'mouse'
          lastInteractionGlobal = 'mouse'
          lastEditorMouseDownAt = Date.now()
          captureScrollForRestore(view.dom as HTMLElement)
          return false
        },
      },
      // 点击编辑器“空白区域”（例如 min-height 留出来的空白）时，
      // ProseMirror 默认会把光标放到文末，可能导致父容器滚动到底部。
      // 这里拦截这种点击：只聚焦，不改变选区，从而避免滚动跳动。
      handleClick(view, _pos, event) {
        lastInteractionRef.current = 'mouse'
        lastInteractionGlobal = 'mouse'
        const e = event as MouseEvent

        // 注意：点在编辑器底部/右侧留白时，posAtCoords 依然可能返回“文末位置”，
        // 导致选区跳到最后一行并触发滚动，甚至在某些情况下触发“自动补一个段落”。
        // 这里用“落点是否指向文末且发生在最后一行下方/右侧空白”来判定留白点击。
        const endPos = view.state.doc.content.size
        const endCoords = view.coordsAtPos(endPos)
        const coords = view.posAtCoords({ left: e.clientX, top: e.clientY })
        const isBelowLastLine = e.clientY > endCoords.bottom + 2
        const isWhitespaceClick = !coords || isBelowLastLine || coords.pos >= endPos

        if (!isWhitespaceClick) {
          // 正常点击文本时，也不要让任何“自动滚动到选区”的行为改变滚动位置
          requestAnimationFrame(() => {
            const snap = clickScrollRestoreRef.current
            if (snap) snap.el.scrollTop = snap.top
          })
          return false
        }

        // 如果文末是标题块（H1/H2），ProseMirror 会在“点击文末位置”时自动插入一个段落，
        // 用来让光标落点合法。这里把光标强制放回标题内部末尾（只改选区，不改内容），避免插入段落。
        const lastBlock = view.state.doc.lastChild
        const isHeadingAtEnd = lastBlock?.type.name === 'heading'
        const isClickAtDocEnd = !!coords && coords.pos >= endPos
        if (isHeadingAtEnd && isClickAtDocEnd) {
          e.preventDefault()
          requestAnimationFrame(() => {
            lastInteractionRef.current = 'programmatic'
            lastInteractionGlobal = 'programmatic'
            const selPos = Math.max(0, endPos - 1)
            const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(selPos), -1))
            view.dispatch(tr)
            view.focus()
            const snap = clickScrollRestoreRef.current
            if (snap) snap.el.scrollTop = snap.top
          })
          return true
        }

        e.preventDefault()
        requestAnimationFrame(() => {
          lastInteractionRef.current = 'programmatic'
          lastInteractionGlobal = 'programmatic'
          // 只聚焦，不通过 commands 修改选区，避免 ProseMirror 在文末“补段落”
          view.focus()
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

