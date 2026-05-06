# Chapter Editor (Mixed + Tiptap) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将章节编辑从 `textarea` 升级为“混合写作编辑器”的右侧富文本（Tiptap），内容以编辑器 JSON 字符串存入现有 `Chapter.content`，并提供自动保存/草稿恢复/离开提醒/字数统计。

**Architecture:** 在现有 `ChapterPage.tsx` 的 `ChapterEditor` 模式内，替换正文编辑为 Tiptap Editor；在保存层将 `editor.getJSON()` 持久化为字符串；对旧纯文本内容做导入兼容；新增草稿与节流保存机制，并修正列表页字数统计（提取 JSON 的纯文本长度）。

**Tech Stack:** React + TypeScript + Tailwind + Vite；Tiptap（ProseMirror）`@tiptap/react` + `@tiptap/starter-kit`；浏览器 `localStorage` 草稿。

---

## File Map（将创建/修改的文件）

**Create**
- `frontend/src/components/chapter/ChapterRichEditor.tsx`：封装 Tiptap 初始化、JSON 输入输出、onChange 产出（jsonString + plainText）
- `frontend/src/utils/chapterContent.ts`：JSON 检测、纯文本提取、纯文本→最小 JSON 的导入适配

**Modify**
- `frontend/src/pages/ChapterPage.tsx`：用富文本编辑器替换 textarea；新增草稿、节流自动保存、离开提示；章节列表字数统计改为纯文本长度
- `frontend/src/types/index.ts`：若需要新增前端内部类型（可选；尽量不改接口形状）
- `frontend/package.json`：新增 tiptap 依赖

---

### Task 1: Add content utilities（JSON 检测 + 纯文本提取）

**Files:**
- Create: `frontend/src/utils/chapterContent.ts`

- [ ] **Step 1: Create `chapterContent.ts`（无外部依赖）**

```ts
// frontend/src/utils/chapterContent.ts
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
  if (typeof node.text === 'string') return node.text
  const children = node.content ?? []
  if (!Array.isArray(children) || children.length === 0) return ''
  return children.map(extractPlainTextFromPM).join('')
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
  const paras = t.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean)
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
```

- [ ] **Step 2: Quick typecheck build**

Run: `cd frontend; npm run build`  
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/chapterContent.ts
git commit -m "feat(frontend): add chapter content json/plaintext utils"
```

---

### Task 2: Add Tiptap dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install deps**

Run:

```bash
cd frontend
npm i @tiptap/react @tiptap/starter-kit
```

Expected: `package-lock.json` updated, install succeeds.

- [ ] **Step 2: Build**

Run: `npm run build`  
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add tiptap dependencies"
```

---

### Task 3: Build `ChapterRichEditor` component（Heading/Bold/Italic/HR + JSON I/O）

**Files:**
- Create: `frontend/src/components/chapter/ChapterRichEditor.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { PMJSON } from '../../utils/chapterContent'
import { plainTextToMinimalDoc, tryParseJson } from '../../utils/chapterContent'

export type ChapterRichEditorValue = {
  jsonString: string
  plainText: string
}

export function ChapterRichEditor({
  initialContent,
  editable,
  onChange,
}: {
  /** 后端的 `Chapter.content`：可能是 JSON 字符串或旧纯文本 */
  initialContent: string | null | undefined
  editable?: boolean
  onChange?: (value: ChapterRichEditorValue) => void
}) {
  const starter = useMemo(
    () =>
      StarterKit.configure({
        // MVP 需要：heading、bold、italic、horizontalRule、history、paragraph
        // StarterKit 默认包含这些；保留默认即可
      }),
    [],
  )

  const editor = useEditor({
    extensions: [starter],
    content: (() => {
      const parsed = tryParseJson<PMJSON>(initialContent ?? '')
      if (parsed) return parsed
      if (typeof initialContent === 'string' && initialContent.trim().length > 0) {
        return plainTextToMinimalDoc(initialContent)
      }
      return { type: 'doc', content: [{ type: 'paragraph' }] }
    })(),
    editable: editable ?? true,
    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none focus:outline-none min-h-[360px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      const jsonString = JSON.stringify(json)
      const plainText = editor.getText()
      onChange?.({ jsonString, plainText })
    },
  })

  // 当 initialContent 变化时（切换章节/恢复草稿），重置内容
  useEffect(() => {
    if (!editor) return
    const parsed = tryParseJson<PMJSON>(initialContent ?? '')
    if (parsed) {
      editor.commands.setContent(parsed, false)
      return
    }
    if (typeof initialContent === 'string' && initialContent.trim().length > 0) {
      editor.commands.setContent(plainTextToMinimalDoc(initialContent), false)
      return
    }
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] }, false)
  }, [editor, initialContent])

  if (!editor) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        编辑器加载中…
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-2 py-2">
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-sm ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-sm ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-sm ${
            editor.isActive('bold')
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          加粗
        </button>
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-sm ${
            editor.isActive('italic')
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          斜体
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          分割线
        </button>
        <div className="ml-auto text-xs text-slate-400">快捷键：Ctrl+B / Ctrl+I</div>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd frontend; npm run build`  
Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chapter/ChapterRichEditor.tsx
git commit -m "feat(frontend): add ChapterRichEditor using tiptap"
```

---

### Task 4: Upgrade `ChapterPage` editor flow（JSON 保存 + 草稿 + 自动保存 + 离开提醒）

**Files:**
- Modify: `frontend/src/pages/ChapterPage.tsx`

- [ ] **Step 1: Replace textarea with `ChapterRichEditor`**

Implementation notes:
- 在 `ChapterEditor` 内新增状态：
  - `contentJson`（string）：当前将要保存的 JSON 字符串（从 editor onChange 来）
  - `plainText`（string）：用于字数显示与“内容不能为空”判断
  - `dirty`、`saveState`（`'saved'|'saving'|'dirty'|'error'`）
- 保存时：
  - `onSave(title, contentJsonString, chapterIndex)` 将 `content` 发 JSON 字符串
  - “内容不能为空”的判断改为 `plainText.trim().length > 0`

- [ ] **Step 2: Implement local draft**

草稿结构：

```ts
type Draft = {
  title: string
  chapterIndex: number
  content: string // jsonString
  updatedAt: number
}
```

Key:
- `new`: `novel_assistant_chapter_draft:<userId>:new`
- `edit`: `novel_assistant_chapter_draft:<userId>:<chapterId>`

读取：
- 进入编辑页时，若草稿存在且 `updatedAt` > `Date.parse(chapter.updatedAt)`（edit 模式）则优先恢复草稿
- create 模式：若草稿存在直接恢复

写入：
- 标题/序号变更 + editor onChange 均节流 500ms 写入本地

- [ ] **Step 3: Implement autosave to backend (edit mode)**

策略：
- `dirty=true` 时，节流 2~3s 调用 `updateChapter(...)`
- 保存成功：`dirty=false`，更新状态为 saved
- 失败：状态 error，但不清草稿

备注：
- create 模式不做自动保存到后端（因为没有 id），只保存本地草稿；点击“保存”创建后清理 `:new` 草稿

- [ ] **Step 4: Implement beforeunload warning**

当 `dirty=true` 或 create 模式有草稿未保存到后端时，注册 `beforeunload` 提示。

- [ ] **Step 5: Update chapter list word count**

在章节列表渲染处将：
- `ch.content ? \`\${ch.content.length} 字\` : ...`
改为：
- `const words = chapterContentToPlainText(ch.content).length`
- 显示 `words.toLocaleString()` 字

- [ ] **Step 6: Build**

Run: `cd frontend; npm run build`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ChapterPage.tsx
git commit -m "feat(frontend): upgrade chapter editor to tiptap json with autosave"
```

---

### Task 5: Smoke test with dev server

**Files:**
- N/A

- [ ] **Step 1: Run dev**

Run: `cd frontend; npm run dev`

- [ ] **Step 2: Manual checks**
- 新建章节：标题 + 正文，插入 H1/H2、加粗、斜体、分割线，保存成功
- 编辑旧章节（纯文本）：打开后能显示为段落；编辑后保存；重新打开仍正常
- 编辑已存 JSON 章节：打开/编辑/自动保存不出错
- 刷新页面：草稿能恢复

---

## Self-review checklist（计划自检）

- 覆盖 spec 的必须项：富文本（Heading/Bold/Italic/HR）、JSON 存储、草稿、自动保存、离开提醒、字数统计 ✅
- 无 TBD/TODO/“自行处理”占位 ✅
- 文件路径明确、命令明确 ✅

