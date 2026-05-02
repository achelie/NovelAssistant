package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.entity.WorldSetting;
import com.novelassistant.service.WorldSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/world-setting")
@RequiredArgsConstructor
public class WorldSettingController {

    private final WorldSettingService worldSettingService;

    @PostMapping
    public Result<WorldSetting> create(@RequestBody WorldSetting worldSetting) {
        worldSettingService.save(worldSetting);
        return Result.success(worldSetting);
    }

    @GetMapping("/{id}")
    public Result<WorldSetting> getById(@PathVariable Long id) {
        return Result.success(worldSettingService.getById(id));
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<WorldSetting>> listByNovel(@PathVariable Long novelId) {
        return Result.success(worldSettingService.listByNovelId(novelId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody WorldSetting worldSetting) {
        worldSetting.setId(id);
        worldSettingService.updateById(worldSetting);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        worldSettingService.removeById(id);
        return Result.success();
    }
}
