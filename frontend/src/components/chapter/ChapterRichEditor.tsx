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

