# 章节写作编辑器（混合布局）设计规格（MVP）

日期：2026-05-06  
状态：待实现  
范围：前端为主（React + TS + Tailwind），后端接口尽量保持兼容（仍使用 `content: string` 字段承载 JSON 字符串）

## 背景与目标

当前章节编辑使用 `textarea`，体验较弱，且不利于后续“AI 续写在光标处插入”等能力。

本 MVP 要实现一个**混合布局**的章节写作编辑体验：

- 左侧：章节列表/大纲（现有页面能力延续）
- 右侧：富文本正文编辑器（先支持最小格式集）
- 内容在后端以**编辑器 JSON**持久化，便于后续扩展（引用、标注、素材块、导出等）

## MVP 范围（明确边界）

### 必须支持（本期）

- **标题（Heading）**
- **普通段落（Paragraph）**
- **加粗 / 斜体（Bold/Italic）**
- **分割线（Horizontal rule）**
- **撤销/重做（History）**
- **自动保存**（本地草稿 + 后端节流保存）
- **保存状态展示**（未保存/保存中/已保存/保存失败）
- **离开页面未保存提醒**
- **字数统计**（按正文纯文本统计，而不是 JSON 字符串长度）

### 明确不做（后续迭代）

- 图片、表格、代码块、列表、脚注、批注/评论、协作
- 多端同步冲突合并（本期只做“最后一次保存覆盖”，并提示失败）
- 导出 HTML / Markdown（后续加）

## 技术选型

### 选型结论

采用 **Tiptap（ProseMirror）**作为右侧富文本内核：

- 快速集成、扩展成熟
- JSON 模型稳定（`editor.getJSON()` / `setContent(...)`）
- 对 MVP 需求（Heading/Bold/Italic/HR）开箱可用（`StarterKit` 覆盖）

### 依赖（前端）

- `@tiptap/react`
- `@tiptap/starter-kit`

（若需要更细粒度控制，可再引入特定 extension，但 MVP 先用 StarterKit 为主）

## 数据模型与兼容策略

### 章节内容存储

后端当前 `Chapter.content` 为 `string | null`，本设计保持接口字段不变：

- **新数据**：`content` 存 **Tiptap/ProseMirror JSON 的字符串化**（`JSON.stringify(editor.getJSON())`）
- **旧数据兼容**：
  - 若 `content` 为空：初始化为空文档
  - 若 `content` 不是 JSON（或 JSON 解析失败）：视为纯文本，导入为 paragraph 文档

### 前端字数统计

不再使用 `content.length`（那会把 JSON 字符串当字数）。

策略：

- 从编辑器 JSON 提取纯文本（遍历节点/文本节点拼接）
- 用纯文本长度作为“字数”
- 列表页（章节卡片）也改为：若 `content` 为 JSON 则提取纯文本长度；否则沿用原字符串长度

## 页面与组件设计

### 入口页面

基于现有 `frontend/src/pages/ChapterPage.tsx` 的“新建/编辑章节”模式进行升级：

- `ChapterEditor` 由 textarea 升级为富文本编辑器组件
- 顶部保留：
  - 章节标题输入框
  - 章节序号输入框
  - 保存/取消按钮
  - 保存状态（已保存/保存中/失败重试提示）

### 编辑器组件拆分（建议）

新增组件（文件名可调整，但保持职责清晰）：

- `components/chapter/ChapterRichEditor.tsx`
  - 封装 Tiptap 初始化、onUpdate、导入/导出 JSON、快捷键、placeholder
  - 暴露：
    - `valueJsonString`（可选受控/半受控）
    - `onChangeJsonString(next: string, plainText: string)`
    - `onInsertText(text: string)`（为后续 AI 续写插入预留）

- `components/chapter/ChapterSaveStatus.tsx`
  - 显示：未保存/保存中/已保存/失败（并给重试）

（如果文件数量过多，可先在 `ChapterPage.tsx` 内实现，后续再抽离。）

## 自动保存与草稿

### 本地草稿（防丢稿底座）

`localStorage` key：`novel_assistant_chapter_draft:<userId>:<chapterId|new>`

保存时机：

- 编辑器内容变化后（onUpdate）节流写入本地
- 标题/序号变化也写入本地

读取优先级（打开编辑页时）：

1. 若存在本地草稿且“比后端更新”（以时间戳判断），提示用户恢复草稿或丢弃
2. 否则使用后端内容

### 后端保存（节流）

- onUpdate 触发变更标记 `dirty=true`
- 2~3 秒无输入后触发 `updateChapter(...)`
- 保存成功：
  - `dirty=false`
  - 记录 `lastSavedAt`
  - 清理或更新本地草稿时间戳
- 保存失败：
  - 状态变为“保存失败”
  - 保留本地草稿（不清）

### 离开页面提示

当 `dirty=true` 时：

- 路由切换/刷新/关闭标签页提示（`beforeunload` + router blocker）

## 错误处理与鉴权

- API 报错提示友好（沿用现有页面 `error` 展示）
- 401 交给请求层统一处理（前面已有“避免旧会话 401 清新 token”的保护）

## 测试与验收标准（手工）

### 核心验收

- 新建章节：输入标题 + 正文，支持 Heading/Bold/Italic/HR，能保存成功
- 编辑章节：能正确加载旧数据
  - 旧纯文本章节：能导入为段落并保存为 JSON
  - 已是 JSON 的章节：能正常渲染并继续编辑
- 自动保存：
  - 断网/刷新：能从本地草稿恢复
  - 保存失败：状态提示明确，草稿不丢
- 字数统计：
  - 编辑页统计为纯文本长度
  - 章节列表显示字数合理（不把 JSON 长度当字数）

## 迁移/发布注意事项

- 后端数据库不强制变更（仍用 `content` 字段承载 JSON 字符串）
- 后续如果需要：
  - 新增 `contentJson` 与 `contentText` 冗余字段（用于检索/列表加速）
  - 或做全文检索/向量化时优先使用 plainText

