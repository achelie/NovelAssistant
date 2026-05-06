package com.novelassistant.controller;

import com.novelassistant.common.PageResult;
import com.novelassistant.common.Result;
import com.novelassistant.dto.CreateChapterRequest;
import com.novelassistant.dto.UpdateChapterRequest;
import com.novelassistant.entity.Chapter;
import com.novelassistant.entity.Novel;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.ChapterService;
import com.novelassistant.service.EmbeddingService;
import com.novelassistant.service.NovelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/chapter")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;
    private final NovelService novelService;
    private final EmbeddingService embeddingService;

    @PostMapping
    public Result<Chapter> create(@Valid @RequestBody CreateChapterRequest request) {
        Long userId = getCurrentUserId();

        Novel novel = novelService.getById(request.getNovelId());
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权在他人的小说下创建章节");
        }
        if (chapterService.existsChapterIndex(request.getNovelId(), request.getChapterIndex(), null)) {
            throw new BusinessException(400, "章节序号已存在，请换一个序号");
        }

        Chapter chapter = new Chapter();
        chapter.setNovelId(request.getNovelId());
        chapter.setTitle(request.getTitle());
        chapter.setContent(request.getContent());
        chapter.setChapterIndex(request.getChapterIndex());

        chapterService.save(chapter);

        asyncIndex("chapter", chapter.getId(), chapter.getNovelId(), chapter.getContent());

        return Result.success(chapter);
    }

    @GetMapping
    public Result<PageResult<Chapter>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Long userId = getCurrentUserId();
        PageResult<Chapter> result = chapterService.pageByUserId(page, pageSize, userId);
        return Result.success(result);
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<Chapter>> listByNovel(@PathVariable Long novelId) {
        Long userId = getCurrentUserId();
        Novel novel = novelService.getById(novelId);
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权查看他人的章节");
        }
        return Result.success(chapterService.listByNovelId(novelId));
    }

    @GetMapping("/{id}")
    public Result<Chapter> getById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Chapter chapter = chapterService.getById(id);

        if (chapter == null) {
            throw new BusinessException(404, "章节不存在");
        }
        checkOwnership(chapter, userId);

        return Result.success(chapter);
    }

    @PutMapping("/{id}")
    public Result<Chapter> update(@PathVariable Long id, @Valid @RequestBody UpdateChapterRequest request) {
        Long userId = getCurrentUserId();
        Chapter chapter = chapterService.getById(id);

        if (chapter == null) {
            throw new BusinessException(404, "章节不存在");
        }
        checkOwnership(chapter, userId);

        if (StringUtils.hasText(request.getTitle())) {
            chapter.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            chapter.setContent(request.getContent());
        }
        if (request.getChapterIndex() != null) {
            if (chapterService.existsChapterIndex(chapter.getNovelId(), request.getChapterIndex(), chapter.getId())) {
                throw new BusinessException(400, "章节序号已存在，请换一个序号");
            }
            chapter.setChapterIndex(request.getChapterIndex());
        }

        chapterService.updateById(chapter);

        asyncIndex("chapter", chapter.getId(), chapter.getNovelId(), chapter.getContent());

        return Result.success(chapter);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Chapter chapter = chapterService.getById(id);

        if (chapter == null) {
            throw new BusinessException(404, "章节不存在");
        }
        checkOwnership(chapter, userId);

        embeddingService.removeBySource("chapter", id);
        chapterService.removeById(id);

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

    private void checkOwnership(Chapter chapter, Long userId) {
        Novel novel = novelService.getById(chapter.getNovelId());
        if (novel == null || !novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的章节");
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
