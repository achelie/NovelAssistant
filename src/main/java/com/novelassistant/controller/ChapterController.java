package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.entity.Chapter;
import com.novelassistant.service.ChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chapter")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;

    @PostMapping
    public Result<Chapter> create(@RequestBody Chapter chapter) {
        chapterService.save(chapter);
        return Result.success(chapter);
    }

    @GetMapping("/{id}")
    public Result<Chapter> getById(@PathVariable Long id) {
        return Result.success(chapterService.getById(id));
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<Chapter>> listByNovel(@PathVariable Long novelId) {
        return Result.success(chapterService.listByNovelId(novelId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Chapter chapter) {
        chapter.setId(id);
        chapterService.updateById(chapter);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        chapterService.removeById(id);
        return Result.success();
    }
}
