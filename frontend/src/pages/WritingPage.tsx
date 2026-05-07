import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNovel } from '../contexts/NovelContext'
import { useWritingDraft } from '../contexts/WritingDraftContext'
import { listSummariesByNovel } from '../api/summary'
import { listCharacters } from '../api/character'
import { listCharacterRelationsByNovel } from '../api/characterRelation'
import { listPlotTimelinesByNovel } from '../api/plotTimeline'
import { listWorldSettingsByNovel } from '../api/worldSetting'
import { listChaptersByNovel, createChapter } from '../api/chapter'
import { previewWritingPrompt, consumeWritingGenerateStream } from '../api/writing'
import { plainTextToMinimalDoc } from '../utils/chapterContent'
import { ChapterRichEditor } from '../components/chapter/ChapterRichEditor'
import { useNavigate } from 'react-router-dom'
import type {
  Chapter,
  Character,
  CharacterRelation,
  PlotTimeline,
  Summary,
  WorldSetting,
  WritingRequest,
} from '../types'

const WORD_OPTIONS = [2000, 3000, 4000] as const
const SUMMARY_PAGE_SIZE = 30
const SUMMARY_MAX_SELECTED = 30

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function charName(characters: Character[], id: number): string {
  return characters.find((c) => c.id === id)?.name ?? `#${id}`
}

function nextChapterIndex(chapters: Chapter[]): number {
  if (chapters.length === 0) return 1
  return Math.max(...chapters.map((c) => c.chapterIndex)) + 1
}

function buildWritingPayload(
  currentId: number,
  outline: string,
  writingStyle: string,
  targetWords: (typeof WORD_OPTIONS)[number],
  summaryIds: number[],
  characterIds: number[],
  relationIds: number[],
  plotIds: number[],
  worldIds: number[],
  chapterTitle?: string,
  chapterIndex?: number,
): WritingRequest {
  return {
    novelId: currentId,
    chapterOutline: outline.trim(),
    writingStyle: writingStyle.trim() || undefined,
    targetWordCount: targetWords,
    summaryIds: summaryIds.length ? summaryIds : undefined,
    characterIds: characterIds.length ? characterIds : undefined,
    characterRelationIds: relationIds.length ? relationIds : undefined,
    plotTimelineIds: plotIds.length ? plotIds : undefined,
    worldSettingIds: worldIds.length ? worldIds : undefined,
    chapterTitle: chapterTitle?.trim() || undefined,
    chapterIndex,
  }
}

export default function WritingPage() {
  const { current } = useNovel()
  const { draft, update, patch, updateForNovel } = useWritingDraft(current?.id)
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [relations, setRelations] = useState<CharacterRelation[]>([])
  const [plots, setPlots] = useState<PlotTimeline[]>([])
  const [worlds, setWorlds] = useState<WorldSetting[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)

  const [previewLoading, setPreviewLoading] = useState(false)

  const [isStreaming, setIsStreaming] = useState(false)
  const streamAbortRef = useRef<AbortController | null>(null)

  const [savingChapter, setSavingChapter] = useState(false)
  const [error, setError] = useState('')
  const [summaryPage, setSummaryPage] = useState(1)

  const suggestedIndex = useMemo(() => nextChapterIndex(chapters), [chapters])

  const loadMaterials = useCallback(
    async (novelId: number) => {
      setMaterialsLoading(true)
      setError('')
      try {
        const [sRes, cRes, rRes, pRes, wRes, chRes] = await Promise.all([
          listSummariesByNovel(novelId),
          listCharacters(1, 200),
          listCharacterRelationsByNovel(novelId),
          listPlotTimelinesByNovel(novelId),
          listWorldSettingsByNovel(novelId),
          listChaptersByNovel(novelId),
        ])
        const sortedSummaries = [...sRes.data].sort((a, b) => b.chapterIndex - a.chapterIndex)
        setSummaries(sortedSummaries)
        setCharacters(cRes.data.records.filter((c) => c.novelId === novelId))
        setRelations(rRes.data)
        setPlots(pRes.data)
        setWorlds(wRes.data)
        const chList = [...chRes.data].sort((a, b) => a.chapterIndex - b.chapterIndex)
        setChapters(chList)
        const next = nextChapterIndex(chList)
        const defaultSummaryIds = sortedSummaries.slice(0, SUMMARY_MAX_SELECTED).map((s) => s.id)
        updateForNovel(novelId, (d) => ({
          ...d,
          chapterTitle: d.chapterTitle.trim() === '' ? `第${next}章` : d.chapterTitle,
          summaryIds: d.summaryIds.length === 0 ? defaultSummaryIds : d.summaryIds,
        }))
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '加载素材失败')
        setSummaries([])
        setCharacters([])
        setRelations([])
        setPlots([])
        setWorlds([])
        setChapters([])
      } finally {
        setMaterialsLoading(false)
      }
    },
    [updateForNovel],
  )

  useEffect(() => {
    if (current) {
      loadMaterials(current.id)
    } else {
      setSummaries([])
      setCharacters([])
      setRelations([])
      setPlots([])
      setWorlds([])
      setChapters([])
    }
  }, [current, loadMaterials])

  const summaryTotalPages = Math.max(1, Math.ceil(summaries.length / SUMMARY_PAGE_SIZE))
  useEffect(() => {
    setSummaryPage((p) => Math.min(Math.max(1, p), summaryTotalPages))
  }, [summaryTotalPages])

  const pagedSummaries = useMemo(() => {
    const start = (summaryPage - 1) * SUMMARY_PAGE_SIZE
    return summaries.slice(start, start + SUMMARY_PAGE_SIZE)
  }, [summaries, summaryPage])

  const allSummariesCheckedOnPage = useMemo(() => {
    if (pagedSummaries.length === 0) return false
    return pagedSummaries.every((s) => draft.summaryIds.includes(s.id))
  }, [draft.summaryIds, pagedSummaries])

  const handleToggleSummary = useCallback(
    (id: number) => {
      update((d) => {
        const checked = d.summaryIds.includes(id)
        if (checked) {
          return { ...d, summaryIds: d.summaryIds.filter((x) => x !== id) }
        }
        if (d.summaryIds.length >= SUMMARY_MAX_SELECTED) {
          setError(`摘要最多勾选 ${SUMMARY_MAX_SELECTED} 条`)
          return d
        }
        return { ...d, summaryIds: [...d.summaryIds, id] }
      })
    },
    [update],
  )

  const handleToggleAllSummariesOnPage = useCallback(() => {
    update((d) => {
      const pageIds = pagedSummaries.map((s) => s.id)
      const pageUnchecked = pageIds.filter((id) => !d.summaryIds.includes(id))

      if (pageUnchecked.length === 0) {
        // 全不选：只移除当前页的
        return { ...d, summaryIds: d.summaryIds.filter((id) => !pageIds.includes(id)) }
      }

      // 全选：受总上限约束，最多补到 30
      const remaining = SUMMARY_MAX_SELECTED - d.summaryIds.length
      if (remaining <= 0) {
        setError(`摘要最多勾选 ${SUMMARY_MAX_SELECTED} 条`)
        return d
      }
      const toAdd = pageUnchecked.slice(0, remaining)
      if (toAdd.length < pageUnchecked.length) {
        setError(`摘要最多勾选 ${SUMMARY_MAX_SELECTED} 条，已只补选本页前 ${toAdd.length} 条`)
      }
      return { ...d, summaryIds: [...d.summaryIds, ...toAdd] }
    })
  }, [pagedSummaries, update])

  const writingPayload = (): WritingRequest | null => {
    if (!current) return null
    const o = draft.outline.trim()
    if (!o) return null
    return buildWritingPayload(
      current.id,
      o,
      draft.writingStyle,
      draft.targetWords,
      draft.summaryIds,
      draft.characterIds,
      draft.relationIds,
      draft.plotIds,
      draft.worldIds,
      draft.chapterTitle,
      suggestedIndex,
    )
  }

  const handlePreview = async () => {
    const payload = writingPayload()
    if (!payload) {
      setError('请先填写本章章纲')
      return
    }
    setPreviewLoading(true)
    setError('')
    patch({ preview: null })
    try {
      const res = await previewWritingPrompt(payload)
      patch({ preview: res.data, promptTab: 'full' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '预览失败')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleStopStream = () => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setIsStreaming(false)
  }

  const handleStartStream = async () => {
    const payload = writingPayload()
    if (!payload) {
      setError('请先填写本章章纲')
      return
    }
    handleStopStream()
    const ac = new AbortController()
    streamAbortRef.current = ac
    patch({ streamPlainText: '', streamContent: '' })
    setIsStreaming(true)
    setError('')
    try {
      await consumeWritingGenerateStream(
        payload,
        (chunk) => {
          update((d) => {
            const nextPlain = d.streamPlainText + chunk
            return {
              ...d,
              streamPlainText: nextPlain,
              streamContent: JSON.stringify(plainTextToMinimalDoc(nextPlain)),
            }
          })
        },
        { signal: ac.signal },
      )
    } catch (e: unknown) {
      const aborted =
        (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError')
      if (aborted) {
        setError('')
      } else {
        setError(e instanceof Error ? e.message : '流式续写失败')
      }
    } finally {
      setIsStreaming(false)
      streamAbortRef.current = null
    }
  }

  const handleSaveChapter = async () => {
    if (!current) return
    const plain = draft.streamPlainText.trim()
    if (!plain) {
      setError('请先生成续写正文后再保存')
      return
    }
    const title = draft.chapterTitle.trim() || `第${suggestedIndex}章`
    setSavingChapter(true)
    setError('')
    try {
      const res = await createChapter({
        novelId: current.id,
        title,
        // 统一保存为 ProseMirror JSON，确保与章节管理富文本一致
        content: draft.streamContent || JSON.stringify(plainTextToMinimalDoc(plain)),
        chapterIndex: suggestedIndex,
      })
      const created = res.data
      patch({ chapterTitle: '', streamPlainText: '', streamContent: '' })
      // 跳转到章节管理并打开刚保存的章节
      navigate('/chapters', { state: { openChapterId: created.id } })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存章节失败')
    } finally {
      setSavingChapter(false)
    }
  }

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort()
    }
  }, [])

  const displayedPrompt =
    draft.preview == null
      ? ''
      : draft.promptTab === 'full'
        ? draft.preview.fullText
        : draft.promptTab === 'system'
          ? draft.preview.systemPrompt
          : draft.preview.userPrompt

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-slate-500">请先在左侧选择一本小说，再使用 AI 续写。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6 pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">AI 续写</h1>
        <p className="mt-2 text-sm text-slate-500">
          勾选素材、填写章纲与可选文风后，可<strong>预览 Prompt</strong>或<strong>流式续写</strong>；生成完成后可<strong>保存为新章节</strong>（写入当前小说，并触发章节向量化索引）。
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      {materialsLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">新章节信息</h2>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">章节标题</span>
                <input
                  type="text"
                  value={draft.chapterTitle}
                  onChange={(e) => patch({ chapterTitle: e.target.value })}
                  disabled={isStreaming}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                  placeholder={`第${suggestedIndex}章`}
                />
              </label>
              <p className="mt-2 text-xs text-slate-400">
                将保存为章节序号 <span className="font-mono text-slate-600">{suggestedIndex}</span>（当前共{' '}
                {chapters.length} 章）
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">可选素材</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <CheckboxPanel
                title="摘要"
                empty="暂无摘要"
                count={summaries.length}
                extra={
                  <div className="flex items-center justify-between gap-2 px-1 pb-2">
                    <button
                      type="button"
                      onClick={handleToggleAllSummariesOnPage}
                      disabled={isStreaming || pagedSummaries.length === 0}
                      className="text-xs font-medium text-indigo-700 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {allSummariesCheckedOnPage ? '本页全不选' : '本页全选'}
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        已选 <span className="font-mono text-slate-700">{draft.summaryIds.length}</span>/
                        {SUMMARY_MAX_SELECTED}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={summaryPage <= 1}
                          onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          上一页
                        </button>
                        <span className="font-mono text-slate-600">
                          {summaryPage}/{summaryTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={summaryPage >= summaryTotalPages}
                          onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          下一页
                        </button>
                      </div>
                    </div>
                  </div>
                }
              >
                {pagedSummaries.map((s) => (
                  <CheckboxRow
                    key={s.id}
                    checked={draft.summaryIds.includes(s.id)}
                    disabled={
                      isStreaming || (!draft.summaryIds.includes(s.id) && draft.summaryIds.length >= SUMMARY_MAX_SELECTED)
                    }
                    onChange={() => handleToggleSummary(s.id)}
                    label={`第${s.chapterIndex}章 · ${s.title}`}
                  />
                ))}
              </CheckboxPanel>
              <CheckboxPanel title="角色" empty="暂无角色" count={characters.length}>
                {characters.map((c) => (
                  <CheckboxRow
                    key={c.id}
                    checked={draft.characterIds.includes(c.id)}
                    disabled={isStreaming}
                    onChange={() => update((d) => ({ ...d, characterIds: toggleId(d.characterIds, c.id) }))}
                    label={c.name}
                  />
                ))}
              </CheckboxPanel>
              <CheckboxPanel title="人物关系" empty="暂无关系" count={relations.length}>
                {relations.map((r) => (
                  <CheckboxRow
                    key={r.id}
                    checked={draft.relationIds.includes(r.id)}
                    disabled={isStreaming}
                    onChange={() => update((d) => ({ ...d, relationIds: toggleId(d.relationIds, r.id) }))}
                    label={`${charName(characters, r.characterAId)} — ${r.relationType} — ${charName(characters, r.characterBId)}`}
                  />
                ))}
              </CheckboxPanel>
              <CheckboxPanel title="剧情时间线" empty="暂无节点" count={plots.length}>
                {plots.map((p) => (
                  <CheckboxRow
                    key={p.id}
                    checked={draft.plotIds.includes(p.id)}
                    disabled={isStreaming}
                    onChange={() => update((d) => ({ ...d, plotIds: toggleId(d.plotIds, p.id) }))}
                    label={p.eventTime ? `${p.eventTime} · ${p.title}` : p.title}
                  />
                ))}
              </CheckboxPanel>
              <CheckboxPanel title="世界观设定" empty="暂无设定" count={worlds.length} className="md:col-span-2">
                {worlds.map((w) => (
                  <CheckboxRow
                    key={w.id}
                    checked={draft.worldIds.includes(w.id)}
                    disabled={isStreaming}
                    onChange={() => update((d) => ({ ...d, worldIds: toggleId(d.worldIds, w.id) }))}
                    label={`[${w.type}] ${w.title}`}
                  />
                ))}
              </CheckboxPanel>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">篇幅</h2>
            <div className="flex flex-wrap gap-3">
              {WORD_OPTIONS.map((n) => (
                <label
                  key={n}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    draft.targetWords === n
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="words"
                    checked={draft.targetWords === n}
                    onChange={() => patch({ targetWords: n })}
                    className="text-indigo-600 focus:ring-indigo-500"
                    disabled={isStreaming}
                  />
                  约 {n} 字
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">章纲与文风</h2>
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                本章章纲 <span className="text-red-500">*</span>
              </span>
              <textarea
                value={draft.outline}
                onChange={(e) => patch({ outline: e.target.value })}
                rows={8}
                disabled={isStreaming}
                className="block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                placeholder="写出本章要写的情节要点、场景、冲突与收束方式…"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
                <span>文风（最多 200 字，可选）</span>
                <span className="font-normal text-xs text-slate-400">{draft.writingStyle.length}/200</span>
              </span>
              <textarea
                value={draft.writingStyle}
                onChange={(e) => patch({ writingStyle: e.target.value.slice(0, 200) })}
                rows={4}
                maxLength={200}
                disabled={isStreaming}
                className="block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                placeholder="如：第三人称、简练、偏重对话；或模仿某类叙事节奏…"
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">续写正文（流式输出）</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                当前约 {draft.streamPlainText.length} 字（字符数，含标点）。生成中可随时停止。
              </p>
            </div>
            <div className="p-3">
              <div className={isStreaming ? 'pointer-events-none opacity-90' : ''}>
                <ChapterRichEditor
                  initialContent={draft.streamContent}
                  onChange={(p) => patch({ streamContent: p.jsonString, streamPlainText: p.plainText })}
                  className="bg-transparent"
                />
              </div>
              {!draft.streamPlainText.trim() ? (
                <p className="mt-2 text-xs text-slate-400">点击「开始流式续写」后，正文将逐字出现在此处…</p>
              ) : null}
            </div>
          </section>

          {draft.preview && (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Prompt 预览</span>
                <div className="ml-auto flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                  {(
                    [
                      ['full', '完整拼接'],
                      ['system', '仅系统'],
                      ['user', '仅用户'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => patch({ promptTab: key })}
                      className={`rounded-md px-3 py-1.5 transition ${
                        draft.promptTab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-slate-700">
                {displayedPrompt}
              </pre>
            </section>
          )}

          <div className="sticky bottom-0 z-10 -mx-6 flex flex-col gap-2 border-t border-slate-200 bg-slate-100/95 px-6 py-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading || isStreaming}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-50 sm:flex-none sm:px-5"
            >
              {previewLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              ) : null}
              预览 Prompt
            </button>
            <button
              type="button"
              onClick={handleStartStream}
              disabled={isStreaming || !draft.outline.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-50 sm:flex-none sm:px-6"
            >
              {isStreaming ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              {isStreaming ? '续写中…' : '开始流式续写'}
            </button>
            <button
              type="button"
              onClick={handleStopStream}
              disabled={!isStreaming}
              className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 sm:flex-none sm:px-5"
            >
              停止
            </button>
            <button
              type="button"
              onClick={handleSaveChapter}
              disabled={savingChapter || isStreaming || !draft.streamPlainText.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-none sm:px-6"
            >
              {savingChapter ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              保存为新章节
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckboxPanel({
  title,
  empty,
  count,
  children,
  className,
  extra,
}: {
  title: string
  empty: string
  count: number
  children: ReactNode
  className?: string
  extra?: ReactNode
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/80 p-3 ${className ?? ''}`}>
      <h3 className="mb-2 text-xs font-semibold text-slate-500">{title}</h3>
      {extra}
      {count === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">{empty}</p>
      ) : (
        <div className="max-h-52 space-y-1 overflow-y-auto">{children}</div>
      )}
    </div>
  )
}

function CheckboxRow({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${checked ? 'bg-indigo-50 text-indigo-900' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="rounded border-slate-300 text-indigo-600"
      />
      <span className="truncate">{label}</span>
    </label>
  )
}
