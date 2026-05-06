package com.novelassistant.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novelassistant.util.ProseMirrorTextUtil;
import com.novelassistant.common.Result;
import com.novelassistant.dto.BatchDeleteSummaryRequest;
import com.novelassistant.dto.CreateSummaryRequest;
import com.novelassistant.dto.GenerateSummaryRequest;
import com.novelassistant.dto.UpdateSummaryRequest;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.novelassistant.entity.Chapter;
import com.novelassistant.entity.Novel;
import com.novelassistant.entity.Summary;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/summary")
@RequiredArgsConstructor
public class SummaryController {

    private final SummaryService summaryService;
    private final NovelService novelService;
    private final ChapterService chapterService;
    private final ZhipuAiService zhipuAiService;
    private final EmbeddingService embeddingService;
    private final ObjectMapper objectMapper;

    @PostMapping
    public Result<Summary> create(@Valid @RequestBody CreateSummaryRequest request) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(request.getNovelId(), userId);

        Summary summary = new Summary();
        summary.setNovelId(request.getNovelId());
        summary.setTitle(request.getTitle());
        summary.setChapterIndex(request.getChapterIndex());
        summary.setContent(request.getContent());

        summaryService.save(summary);

        asyncIndex("summary", summary.getId(), summary.getNovelId(), summary.getContent());

        return Result.success(summary);
    }

    @PostMapping("/generate")
    public Result<List<Summary>> generate(@Valid @RequestBody GenerateSummaryRequest request) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(request.getNovelId(), userId);

        List<Chapter> chapters = request.getChapterIds().stream()
                .map(chapterService::getById)
                .filter(ch -> ch != null && ch.getNovelId().equals(request.getNovelId()))
                .sorted((a, b) -> {
                    int ia = a.getChapterIndex() != null ? a.getChapterIndex() : 0;
                    int ib = b.getChapterIndex() != null ? b.getChapterIndex() : 0;
                    return Integer.compare(ia, ib);
                })
                .collect(Collectors.toList());

        if (chapters.isEmpty()) {
            throw new BusinessException(400, "所选章节不存在或不属于该小说");
        }

        String systemPrompt = "你是一个专业的小说编辑助手。你将根据提供的章节内容生成摘要。" +
                "要求：每章摘要约200字左右（±60字均可），语言简洁、信息密度高，包含主要情节、关键人物行动、重要事件与转折点。" +
                "必须逐章生成，不要合并成1-10章这种总摘要。";

        int n = chapters.size();
        List<Summary> saved = new ArrayList<>(n);

        // 每5章调用一次AI（最后不足5章也调用一次），但仍然逐章产出摘要
        for (int i = 0; i < chapters.size(); i += 5) {
            List<Chapter> batch = chapters.subList(i, Math.min(i + 5, chapters.size()));
            String userPrompt = buildBatchSummaryPrompt(batch);
            String aiRaw = zhipuAiService.chat(systemPrompt, userPrompt);

            Map<Integer, String> summaryByIndex = parseBatchSummaries(aiRaw);

            for (Chapter ch : batch) {
                int chapterIndex = ch.getChapterIndex() != null ? ch.getChapterIndex() : 0;
                String generatedContent = summaryByIndex.get(chapterIndex);
                if (!StringUtils.hasText(generatedContent)) {
                    throw new BusinessException(500, "AI返回缺少第" + chapterIndex + "章摘要，请重试");
                }

                String title = resolveGeneratedTitle(request.getTitle(), n, chapterIndex);

                Summary summary = summaryService.getOne(
                        new LambdaQueryWrapper<Summary>()
                                .eq(Summary::getNovelId, request.getNovelId())
                                .eq(Summary::getChapterIndex, chapterIndex)
                                .orderByAsc(Summary::getId)
                                .last("LIMIT 1"),
                        false);

                if (summary == null) {
                    summary = new Summary();
                    summary.setNovelId(request.getNovelId());
                    summary.setChapterIndex(chapterIndex);
                }

                summary.setTitle(title);
                summary.setContent(generatedContent.trim());

                if (summary.getId() == null) {
                    summaryService.save(summary);
                } else {
                    summaryService.updateById(summary);
                }

                asyncIndex("summary", summary.getId(), summary.getNovelId(), summary.getContent());
                saved.add(summary);
            }
        }

        return Result.success(saved);
    }

    private static String buildBatchSummaryPrompt(List<Chapter> batch) {
        StringBuilder sb = new StringBuilder(16_384);
        sb.append("请为以下章节分别生成摘要，并严格按JSON格式输出（不要Markdown，不要```代码块```，不要多余解释）。\n")
                .append("输出格式（示例）：{\"items\":[{\"chapterIndex\":1,\"summary\":\"...\"}]}\n")
                .append("要求：items长度必须等于输入章节数；summary为对应章节摘要（约200字）。\n\n");

        for (Chapter ch : batch) {
            int chapterIndex = ch.getChapterIndex() != null ? ch.getChapterIndex() : 0;
            sb.append("【chapterIndex=").append(chapterIndex).append("】\n");
            sb.append("标题：").append(ch.getTitle() != null ? ch.getTitle() : "").append("\n");
            sb.append("正文：\n");
            sb.append(ProseMirrorTextUtil.extractPlainText(ch.getContent())).append("\n\n");
        }
        return sb.toString();
    }

    private Map<Integer, String> parseBatchSummaries(String aiRaw) {
        if (!StringUtils.hasText(aiRaw)) {
            throw new BusinessException(500, "AI返回为空，请重试");
        }

        String json = extractJsonObject(aiRaw.trim());
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode items = root;
            if (root.isObject() && root.has("items")) {
                items = root.get("items");
            }

            if (!items.isArray()) {
                throw new BusinessException(500, "AI返回JSON格式不正确（缺少items数组）");
            }

            Map<Integer, String> map = new HashMap<>();
            for (JsonNode it : items) {
                int idx = it.path("chapterIndex").asInt(Integer.MIN_VALUE);
                String summary = it.path("summary").asText(null);
                if (idx == Integer.MIN_VALUE) continue;
                if (summary != null) {
                    map.put(idx, summary);
                }
            }
            return map;
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            throw new BusinessException(500, "解析AI返回失败: " + e.getMessage());
        }
    }

    /**
     * 兼容 AI 偶尔夹带前后说明文字的情况：取第一个'{'到最后一个'}'。
     */
    private static String extractJsonObject(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return raw.substring(start, end + 1);
        }
        return raw;
    }

    /**
     * 多选章节时为每一章各一条「第N章摘要」；仅选一章且填写了标题时，标题以用户输入为准。
     */
    private static String resolveGeneratedTitle(String requestTitle, int selectedCount, int chapterIndex) {
        if (StringUtils.hasText(requestTitle)) {
            if (selectedCount == 1) {
                return requestTitle;
            }
            return requestTitle + "·第" + chapterIndex + "章摘要";
        }
        return "第" + chapterIndex + "章摘要";
    }

    @GetMapping("/{id}")
    public Result<Summary> getById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Summary summary = summaryService.getById(id);
        if (summary == null) {
            throw new BusinessException(404, "摘要不存在");
        }
        checkNovelOwnership(summary.getNovelId(), userId);

        return Result.success(summary);
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<Summary>> listByNovel(@PathVariable Long novelId) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(novelId, userId);

        return Result.success(summaryService.listByNovelId(novelId));
    }

    @PutMapping("/{id}")
    public Result<Summary> update(@PathVariable Long id, @Valid @RequestBody UpdateSummaryRequest request) {
        Long userId = getCurrentUserId();
        Summary summary = summaryService.getById(id);
        if (summary == null) {
            throw new BusinessException(404, "摘要不存在");
        }
        checkNovelOwnership(summary.getNovelId(), userId);

        if (StringUtils.hasText(request.getTitle())) {
            summary.setTitle(request.getTitle());
        }
        if (request.getChapterIndex() != null) {
            summary.setChapterIndex(request.getChapterIndex());
        }
        if (request.getContent() != null) {
            summary.setContent(request.getContent());
        }

        summaryService.updateById(summary);

        asyncIndex("summary", summary.getId(), summary.getNovelId(), summary.getContent());

        return Result.success(summary);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Summary summary = summaryService.getById(id);
        if (summary == null) {
            throw new BusinessException(404, "摘要不存在");
        }
        checkNovelOwnership(summary.getNovelId(), userId);

        embeddingService.removeBySource("summary", id);
        summaryService.removeById(id);

        return Result.success();
    }

    @PostMapping("/batch-delete")
    public Result<Void> batchDelete(@Valid @RequestBody BatchDeleteSummaryRequest request) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(request.getNovelId(), userId);

        List<Long> ids = request.getSummaryIds();
        if (ids == null || ids.isEmpty()) {
            return Result.success();
        }

        // 只删除当前小说下的摘要，避免越权/脏数据
        List<Summary> toDelete = summaryService.list(
                new LambdaQueryWrapper<Summary>()
                        .eq(Summary::getNovelId, request.getNovelId())
                        .in(Summary::getId, ids)
        );
        if (toDelete.isEmpty()) {
            return Result.success();
        }

        List<Long> resolvedIds = toDelete.stream().map(Summary::getId).collect(Collectors.toList());
        embeddingService.removeBySourceIds("summary", resolvedIds);
        summaryService.remove(new LambdaQueryWrapper<Summary>()
                .eq(Summary::getNovelId, request.getNovelId())
                .in(Summary::getId, resolvedIds));

        return Result.success();
    }

    private void asyncIndex(String sourceType, Long sourceId, Long novelId, String content) {
        if (content != null && !content.isBlank()) {
            try {
                embeddingService.indexText(novelId, sourceType, sourceId, content);
            } catch (Exception e) {
                log.warn("自动向量化失败: sourceType={}, sourceId={}", sourceType, sourceId, e);
            }
        }
    }

    private void checkNovelOwnership(Long novelId, Long userId) {
        Novel novel = novelService.getById(novelId);
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的摘要");
        }
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new BusinessException(401, "请先登录");
        }
        return (Long) authentication.getPrincipal();
    }
}
