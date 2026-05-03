package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.entity.Novel;
import com.novelassistant.entity.PlotTimeline;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.NovelService;
import com.novelassistant.service.PlotTimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/plot-timeline")
@RequiredArgsConstructor
public class PlotTimelineController {

    private final PlotTimelineService plotTimelineService;
    private final NovelService novelService;

    @PostMapping
    public Result<PlotTimeline> create(@RequestBody PlotTimeline plotTimeline) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(plotTimeline.getNovelId(), userId);

        plotTimelineService.save(plotTimeline);
        return Result.success(plotTimeline);
    }

    @GetMapping("/{id}")
    public Result<PlotTimeline> getById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        PlotTimeline plotTimeline = plotTimelineService.getById(id);
        if (plotTimeline == null) {
            throw new BusinessException(404, "剧情节点不存在");
        }
        checkNovelOwnership(plotTimeline.getNovelId(), userId);

        return Result.success(plotTimeline);
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<PlotTimeline>> listByNovel(@PathVariable Long novelId) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(novelId, userId);

        return Result.success(plotTimelineService.listByNovelId(novelId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody PlotTimeline plotTimeline) {
        Long userId = getCurrentUserId();
        PlotTimeline existing = plotTimelineService.getById(id);
        if (existing == null) {
            throw new BusinessException(404, "剧情节点不存在");
        }
        checkNovelOwnership(existing.getNovelId(), userId);

        plotTimeline.setId(id);
        plotTimelineService.updateById(plotTimeline);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        PlotTimeline existing = plotTimelineService.getById(id);
        if (existing == null) {
            throw new BusinessException(404, "剧情节点不存在");
        }
        checkNovelOwnership(existing.getNovelId(), userId);

        plotTimelineService.removeById(id);
        return Result.success();
    }

    private void checkNovelOwnership(Long novelId, Long userId) {
        Novel novel = novelService.getById(novelId);
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的剧情时间线");
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
