package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.entity.Novel;
import com.novelassistant.entity.WorldSetting;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.EmbeddingService;
import com.novelassistant.service.NovelService;
import com.novelassistant.service.WorldSettingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/world-setting")
@RequiredArgsConstructor
public class WorldSettingController {

    private final WorldSettingService worldSettingService;
    private final NovelService novelService;
    private final EmbeddingService embeddingService;

    @PostMapping
    public Result<WorldSetting> create(@RequestBody WorldSetting worldSetting) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(worldSetting.getNovelId(), userId);

        worldSettingService.save(worldSetting);

        asyncIndex("world_setting", worldSetting.getId(), worldSetting.getNovelId(), worldSetting.getContent());

        return Result.success(worldSetting);
    }

    @GetMapping("/{id}")
    public Result<WorldSetting> getById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        WorldSetting worldSetting = worldSettingService.getById(id);
        if (worldSetting == null) {
            throw new BusinessException(404, "世界观设定不存在");
        }
        checkNovelOwnership(worldSetting.getNovelId(), userId);

        return Result.success(worldSetting);
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<WorldSetting>> listByNovel(@PathVariable Long novelId) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(novelId, userId);

        return Result.success(worldSettingService.listByNovelId(novelId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody WorldSetting worldSetting) {
        Long userId = getCurrentUserId();
        WorldSetting existing = worldSettingService.getById(id);
        if (existing == null) {
            throw new BusinessException(404, "世界观设定不存在");
        }
        checkNovelOwnership(existing.getNovelId(), userId);

        worldSetting.setId(id);
        worldSettingService.updateById(worldSetting);

        asyncIndex("world_setting", id, existing.getNovelId(), worldSetting.getContent());

        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        WorldSetting existing = worldSettingService.getById(id);
        if (existing == null) {
            throw new BusinessException(404, "世界观设定不存在");
        }
        checkNovelOwnership(existing.getNovelId(), userId);

        embeddingService.removeBySource("world_setting", id);
        worldSettingService.removeById(id);
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
            throw new BusinessException(403, "无权操作他人的世界观设定");
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
