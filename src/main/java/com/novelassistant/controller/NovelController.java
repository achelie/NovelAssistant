package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.entity.Novel;
import com.novelassistant.service.NovelService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/novel")
@RequiredArgsConstructor
public class NovelController {

    private final NovelService novelService;

    @PostMapping
    public Result<Novel> create(@RequestBody Novel novel) {
        novelService.save(novel);
        return Result.success(novel);
    }

    @GetMapping("/{id}")
    public Result<Novel> getById(@PathVariable Long id) {
        return Result.success(novelService.getById(id));
    }

    @GetMapping("/user/{userId}")
    public Result<List<Novel>> listByUser(@PathVariable Long userId) {
        return Result.success(novelService.listByUserId(userId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Novel novel) {
        novel.setId(id);
        novelService.updateById(novel);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        novelService.removeById(id);
        return Result.success();
    }
}
