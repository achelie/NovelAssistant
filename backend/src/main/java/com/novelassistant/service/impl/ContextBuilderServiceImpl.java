package com.novelassistant.service.impl;

import com.novelassistant.entity.*;
import com.novelassistant.entity.Character;
import com.novelassistant.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContextBuilderServiceImpl implements ContextBuilderService {

    private final SummaryService summaryService;
    private final CharacterService characterService;
    private final WorldSettingService worldSettingService;
    private final CharacterRelationService characterRelationService;
    private final PlotTimelineService plotTimelineService;
    private final EmbeddingService embeddingService;
    private final ZhipuAiService zhipuAiService;

    private static final int RAG_TOP_K = 5;
    // 允许“剧情背景（摘要）”拼接的最大长度（字符数），用于承载较长的多章背景
    private static final int MAX_SUMMARY_LENGTH = 10_000;
    private static final int MAX_SUMMARY_COUNT = 20;

    @Override
    public String buildSystemPrompt() {
        return "你是一位专业的小说创作者，擅长根据已有设定续写连贯的章节内容。" +
               "你需要严格遵循给定的角色性格、世界观设定、剧情走向与文风要求，" +
               "保持情节连贯、人物形象鲜明。" +
               "输出纯小说正文内容，不要添加任何元信息、标题前缀或 Markdown 解释。" +
               "排版要求（必须严格遵守）：每一句话结束后立刻换行，段与段之间空一行；不要把多句挤在同一段里。若未按格式输出，视为不合格输出，需要你自动纠正并按格式重排后再输出。";
    }

    @Override
    public String buildUserPrompt(WritingContext context) {
        StringBuilder prompt = new StringBuilder();

        // 1. 剧情背景（摘要压缩）
        String summarySection = buildSummarySection(context.summaryIds(), context.skipLlmCompression());
        if (!summarySection.isEmpty()) {
            prompt.append("【剧情背景】\n").append(summarySection).append("\n\n");
        }

        // 2. 本章出场角色
        String characterSection = buildCharacterSection(context.characterIds());
        if (!characterSection.isEmpty()) {
            prompt.append("【本章出场角色】\n").append(characterSection).append("\n\n");
        }

        // 3. 角色关系
        String relationSection = buildRelationSection(context.characterRelationIds(), context.characterIds());
        if (!relationSection.isEmpty()) {
            prompt.append("【角色关系】\n").append(relationSection).append("\n\n");
        }

        // 3.5 剧情时间线
        String plotSection = buildPlotTimelineSection(context.plotTimelineIds());
        if (!plotSection.isEmpty()) {
            prompt.append("【剧情时间线】\n").append(plotSection).append("\n\n");
        }

        // 4. 世界观设定
        String worldSection = buildWorldSettingSection(context.worldSettingIds());
        if (!worldSection.isEmpty()) {
            prompt.append("【世界观设定】\n").append(worldSection).append("\n\n");
        }

        // 5. 向量库：伏笔与关联剧情
        String ragSection = buildRagSection(
                context.novelId(),
                context.chapterOutline(),
                context.writingStyle());
        if (!ragSection.isEmpty()) {
            prompt.append("【伏笔与关联剧情（向量检索）】\n")
                    .append("以下片段来自小说已索引的正文、摘要或设定，按与「章纲+文风」的语义相关度选取，写作时请自然呼应、收束伏笔或保持设定一致：\n")
                    .append(ragSection)
                    .append("\n\n");
        }

        // 6. 章纲
        prompt.append("【本章大纲】\n").append(context.chapterOutline()).append("\n\n");

        // 7. 文风
        if (StringUtils.hasText(context.writingStyle())) {
            prompt.append("【文风要求】\n").append(context.writingStyle().trim()).append("\n\n");
        }

        // 8. 篇幅与续写指令
        prompt.append("【篇幅与续写指令】\n");
        prompt.append("- 目标字数约 ").append(context.targetWordCount()).append(" 字（可合理浮动，以情节完整为准）。\n");
        prompt.append("- 紧扣本章大纲，并与剧情背景、角色、关系、时间线、世界观及上述检索片段相协调。\n");
        if (StringUtils.hasText(context.writingStyle())) {
            prompt.append("- 文风须符合「文风要求」一节。\n");
        }
        prompt.append("- 直接输出小说正文，不要章节标题、不要作者按语。\n");
        prompt.append("- 排版（必须）：每一句话结束后立刻换行，段与段之间空一行；不要把多句挤在同一段里。\n");
        prompt.append("- 输出格式示例（仅示例格式，不要照抄内容）：\n");
        prompt.append("她推开门。\n\n");
        prompt.append("屋里一片漆黑。\n\n");
        prompt.append("远处传来脚步声。");

        return prompt.toString();
    }

    private String buildSummarySection(List<Long> summaryIds, boolean skipLlmCompression) {
        if (summaryIds == null || summaryIds.isEmpty()) return "";

        if (summaryIds.size() > MAX_SUMMARY_COUNT) {
            throw new com.novelassistant.exception.BusinessException(400,
                    "最多只能勾选" + MAX_SUMMARY_COUNT + "章摘要，当前选择了" + summaryIds.size() + "章");
        }

        List<Summary> summaries = summaryIds.stream()
                .map(summaryService::getById)
                .filter(s -> s != null)
                .collect(Collectors.toList());

        if (summaries.isEmpty()) return "";

        String combinedSummaries = summaries.stream()
                .map(s -> s.getTitle() + "：" + (s.getContent() != null ? s.getContent() : ""))
                .collect(Collectors.joining("\n"));

        if (combinedSummaries.length() <= MAX_SUMMARY_LENGTH) {
            return combinedSummaries;
        }

        if (skipLlmCompression) {
            return combinedSummaries.substring(0, Math.min(combinedSummaries.length(), MAX_SUMMARY_LENGTH)) + "…（预览模式：已截断，正式续写时可启用模型压缩）";
        }

        try {
            String compressed = zhipuAiService.chat(
                    "你是一个文本压缩助手，请将以下多段小说摘要整合为一段连贯的剧情背景，不超过500字，保留关键剧情和转折。",
                    combinedSummaries
            );
            return compressed.length() > MAX_SUMMARY_LENGTH + 50
                    ? compressed.substring(0, MAX_SUMMARY_LENGTH + 50)
                    : compressed;
        } catch (Exception e) {
            log.warn("摘要压缩失败，使用截断方式", e);
            return combinedSummaries.substring(0, Math.min(combinedSummaries.length(), MAX_SUMMARY_LENGTH));
        }
    }

    private String buildCharacterSection(List<Long> characterIds) {
        if (characterIds == null || characterIds.isEmpty()) return "";

        return characterIds.stream()
                .map(characterService::getById)
                .filter(c -> c != null)
                .map(this::formatCharacter)
                .collect(Collectors.joining("\n"));
    }

    private String formatCharacter(Character c) {
        StringBuilder sb = new StringBuilder();
        sb.append("- ").append(c.getName());
        if (c.getPersonality() != null && !c.getPersonality().isBlank()) {
            sb.append("（性格：").append(c.getPersonality()).append("）");
        }
        if (c.getBackground() != null && !c.getBackground().isBlank()) {
            sb.append("  背景：").append(truncate(c.getBackground(), 100));
        }
        return sb.toString();
    }

    private String buildRelationSection(List<Long> relationIds, List<Long> characterIds) {
        if (relationIds == null || relationIds.isEmpty()) return "";

        return relationIds.stream()
                .map(characterRelationService::getById)
                .filter(r -> r != null)
                .map(r -> {
                    String nameA = getCharacterName(r.getCharacterAId());
                    String nameB = getCharacterName(r.getCharacterBId());
                    String desc = r.getDescription() != null ? " — " + truncate(r.getDescription(), 50) : "";
                    return "- " + nameA + " 与 " + nameB + "：" + r.getRelationType() + desc;
                })
                .collect(Collectors.joining("\n"));
    }

    private String getCharacterName(Long characterId) {
        Character c = characterService.getById(characterId);
        return c != null ? c.getName() : "未知角色";
    }

    private String buildPlotTimelineSection(List<Long> plotTimelineIds) {
        if (plotTimelineIds == null || plotTimelineIds.isEmpty()) return "";

        return plotTimelineIds.stream()
                .map(plotTimelineService::getById)
                .filter(p -> p != null)
                .map(p -> {
                    String time = p.getEventTime() != null && !p.getEventTime().isBlank()
                            ? "[" + p.getEventTime() + "] "
                            : "";
                    String desc = p.getDescription() != null && !p.getDescription().isBlank()
                            ? "：" + truncate(p.getDescription(), 200)
                            : "";
                    return "- " + time + p.getTitle() + desc;
                })
                .collect(Collectors.joining("\n"));
    }

    private String buildWorldSettingSection(List<Long> worldSettingIds) {
        if (worldSettingIds == null || worldSettingIds.isEmpty()) return "";

        return worldSettingIds.stream()
                .map(worldSettingService::getById)
                .filter(w -> w != null)
                .map(w -> "- " + w.getTitle() + "：" + truncate(w.getContent(), 150))
                .collect(Collectors.joining("\n"));
    }

    private String buildRagSection(Long novelId, String chapterOutline, String writingStyle) {
        if (chapterOutline == null || chapterOutline.isBlank()) return "";

        StringBuilder query = new StringBuilder(chapterOutline.trim());
        if (StringUtils.hasText(writingStyle)) {
            query.append("\n【文风】").append(writingStyle.trim());
        }

        try {
            List<TextChunk> relevantChunks = embeddingService.search(novelId, query.toString(), RAG_TOP_K);
            if (relevantChunks.isEmpty()) return "";

            return relevantChunks.stream()
                    .map(chunk -> "- [" + formatChunkSource(chunk.getSourceType()) + "] "
                            + truncate(chunk.getChunkText(), 280))
                    .collect(Collectors.joining("\n"));
        } catch (Exception e) {
            log.warn("RAG检索失败，跳过相关上下文", e);
            return "";
        }
    }

    private static String formatChunkSource(String sourceType) {
        if (sourceType == null) return "片段";
        return switch (sourceType) {
            case "chapter" -> "章节正文";
            case "summary" -> "摘要";
            case "world_setting" -> "世界观";
            default -> sourceType;
        };
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }
}
