package com.novelassistant.controller;

import com.novelassistant.common.Result;
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
import java.util.List;
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

        String systemPrompt = "你是一个专业的小说编辑助手。请根据提供的章节内容，生成一份精炼的摘要。" +
                "摘要应包含：主要情节发展、关键人物行动、重要事件和转折点。" +
                "要求语言简洁、信息密度高，便于作者回顾故事脉络。直接输出摘要内容，不要有多余的前缀或解释。";

        int n = chapters.size();
        List<Summary> saved = new ArrayList<>(n);

        for (Chapter ch : chapters) {
            StringBuilder textBuilder = new StringBuilder();
            textBuilder.append("【").append(ch.getTitle()).append("】\n");
            if (ch.getContent() != null) {
                textBuilder.append(ch.getContent());
            }

            String userPrompt = "请为本章内容生成摘要：\n\n" + textBuilder;
            String generatedContent = zhipuAiService.chat(systemPrompt, userPrompt);

            int chapterIndex = ch.getChapterIndex() != null ? ch.getChapterIndex() : 0;
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
            summary.setContent(generatedContent);

            if (summary.getId() == null) {
                summaryService.save(summary);
            } else {
                summaryService.updateById(summary);
            }

            asyncIndex("summary", summary.getId(), summary.getNovelId(), summary.getContent());
            saved.add(summary);
        }

        return Result.success(saved);
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
