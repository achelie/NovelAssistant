package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.dto.CreateSummaryRequest;
import com.novelassistant.dto.UpdateSummaryRequest;
import com.novelassistant.entity.Novel;
import com.novelassistant.entity.Summary;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.EmbeddingService;
import com.novelassistant.service.NovelService;
import com.novelassistant.service.SummaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/summary")
@RequiredArgsConstructor
public class SummaryController {

    private final SummaryService summaryService;
    private final NovelService novelService;
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
