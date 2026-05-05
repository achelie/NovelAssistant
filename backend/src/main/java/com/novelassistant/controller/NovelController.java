package com.novelassistant.controller;

import com.novelassistant.common.PageResult;
import com.novelassistant.common.Result;
import com.novelassistant.dto.CreateNovelRequest;
import com.novelassistant.dto.UpdateNovelRequest;
import com.novelassistant.entity.Novel;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.NovelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/novel")
@RequiredArgsConstructor
public class NovelController {

    private final NovelService novelService;

    @PostMapping
    public Result<Novel> create(@Valid @RequestBody CreateNovelRequest request) {
        Long userId = getCurrentUserId();

        Novel novel = new Novel();
        novel.setUserId(userId);
        novel.setTitle(request.getTitle());
        novel.setDescription(request.getDescription());
        novel.setCoverUrl(request.getCoverUrl());
        novel.setStatus("draft");
        novel.setWordCount(0);

        novelService.save(novel);

        return Result.success(novel);
    }

    @GetMapping
    public Result<PageResult<Novel>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String keyword) {
        Long userId = getCurrentUserId();
        PageResult<Novel> result = novelService.pageQuery(userId, page, pageSize, keyword);
        return Result.success(result);
    }

    @GetMapping("/{id}")
    public Result<Novel> getById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Novel novel = novelService.getById(id);
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权查看他人的小说");
        }
        return Result.success(novel);
    }

    @PutMapping("/{id}")
    public Result<Novel> update(@PathVariable Long id, @Valid @RequestBody UpdateNovelRequest request) {
        Long userId = getCurrentUserId();
        Novel novel = novelService.getById(id);

        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权修改他人的小说");
        }

        if (StringUtils.hasText(request.getTitle())) {
            novel.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            novel.setDescription(request.getDescription());
        }
        if (request.getCoverUrl() != null) {
            novel.setCoverUrl(request.getCoverUrl());
        }
        if (StringUtils.hasText(request.getStatus())) {
            novel.setStatus(request.getStatus());
        }

        novelService.updateById(novel);

        return Result.success(novel);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Novel novel = novelService.getById(id);

        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权删除他人的小说");
        }

        novelService.removeNovelCascade(id);

        return Result.success();
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || authentication.getPrincipal() == null
                || !(authentication.getPrincipal() instanceof Long)) {
            throw new BusinessException(401, "请先登录");
        }
        return (Long) authentication.getPrincipal();
    }
}
