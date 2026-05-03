package com.novelassistant.service.impl;

import com.novelassistant.entity.*;
import com.novelassistant.entity.Character;
import com.novelassistant.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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
    private static final int MAX_SUMMARY_LENGTH = 500;
    private static final int MAX_SUMMARY_COUNT = 20;

    @Override
    public String buildSystemPrompt() {
        return "你是一位专业的小说创作者，擅长根据已有设定续写连贯的章节内容。" +
               "你需要严格遵循给定的角色性格、世界观设定和剧情走向，" +
               "保持文风统一，情节连贯，人物形象鲜明。" +
               "输出纯小说正文内容，不要添加任何元信息或解释。";
    }

    @Override
    public String buildUserPrompt(WritingContext context) {
        StringBuilder prompt = new StringBuilder();

        // 1. 剧情背景（摘要压缩）
        String summarySection = buildSummarySection(context.summaryIds());
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

        // 5. RAG 相关上下文
        String ragSection = buildRagSection(context.novelId(), context.chapterOutline());
        if (!ragSection.isEmpty()) {
            prompt.append("【相关上下文参考】\n").append(ragSection).append("\n\n");
        }

        // 6. 章纲
        prompt.append("【本章大纲】\n").append(context.chapterOutline()).append("\n\n");

        prompt.append("【要求】\n");
        prompt.append("请根据以上信息续写本章内容。保持人物性格一致，情节连贯，文风统一。直接输出小说正文。");

        return prompt.toString();
    }

    private String buildSummarySection(List<Long> summaryIds) {
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

    private String buildRagSection(Long novelId, String chapterOutline) {
        if (chapterOutline == null || chapterOutline.isBlank()) return "";

        try {
            List<TextChunk> relevantChunks = embeddingService.search(novelId, chapterOutline, RAG_TOP_K);
            if (relevantChunks.isEmpty()) return "";

            return relevantChunks.stream()
                    .map(chunk -> truncate(chunk.getChunkText(), 200))
                    .collect(Collectors.joining("\n---\n"));
        } catch (Exception e) {
            log.warn("RAG检索失败，跳过相关上下文", e);
            return "";
        }
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }
}
