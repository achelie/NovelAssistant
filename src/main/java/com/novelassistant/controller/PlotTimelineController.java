package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.entity.PlotTimeline;
import com.novelassistant.service.PlotTimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/plot-timeline")
@RequiredArgsConstructor
public class PlotTimelineController {

    private final PlotTimelineService plotTimelineService;

    @PostMapping
    public Result<PlotTimeline> create(@RequestBody PlotTimeline plotTimeline) {
        plotTimelineService.save(plotTimeline);
        return Result.success(plotTimeline);
    }

    @GetMapping("/{id}")
    public Result<PlotTimeline> getById(@PathVariable Long id) {
        return Result.success(plotTimelineService.getById(id));
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<PlotTimeline>> listByNovel(@PathVariable Long novelId) {
        return Result.success(plotTimelineService.listByNovelId(novelId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody PlotTimeline plotTimeline) {
        plotTimeline.setId(id);
        plotTimelineService.updateById(plotTimeline);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        plotTimelineService.removeById(id);
        return Result.success();
    }
}
