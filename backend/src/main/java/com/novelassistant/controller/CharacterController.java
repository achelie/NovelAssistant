package com.novelassistant.controller;

import com.novelassistant.common.PageResult;
import com.novelassistant.common.Result;
import com.novelassistant.dto.CreateCharacterRequest;
import com.novelassistant.dto.UpdateCharacterRequest;
import com.novelassistant.entity.Character;
import com.novelassistant.entity.Novel;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.CharacterService;
import com.novelassistant.service.NovelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/character")
@RequiredArgsConstructor
public class CharacterController {

    private final CharacterService characterService;
    private final NovelService novelService;

    @PostMapping
    public Result<Character> create(@Valid @RequestBody CreateCharacterRequest request) {
        Long userId = getCurrentUserId();

        Novel novel = novelService.getById(request.getNovelId());
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权在他人的小说下创建角色");
        }

        Character character = new Character();
        character.setNovelId(request.getNovelId());
        character.setName(request.getName());
        character.setDescription(request.getDescription());
        character.setPersonality(request.getPersonality());
        character.setBackground(request.getBackground());

        characterService.save(character);

        return Result.success(character);
    }

    @GetMapping
    public Result<PageResult<Character>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        Long userId = getCurrentUserId();
        PageResult<Character> result = characterService.pageByUserId(page, pageSize, userId);
        return Result.success(result);
    }

    @GetMapping("/{id}")
    public Result<Character> getById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Character character = characterService.getById(id);

        if (character == null) {
            throw new BusinessException(404, "角色不存在");
        }
        checkOwnership(character, userId);

        return Result.success(character);
    }

    @PutMapping("/{id}")
    public Result<Character> update(@PathVariable Long id, @Valid @RequestBody UpdateCharacterRequest request) {
        Long userId = getCurrentUserId();
        Character character = characterService.getById(id);

        if (character == null) {
            throw new BusinessException(404, "角色不存在");
        }
        checkOwnership(character, userId);

        if (StringUtils.hasText(request.getName())) {
            character.setName(request.getName());
        }
        if (request.getDescription() != null) {
            character.setDescription(request.getDescription());
        }
        if (request.getPersonality() != null) {
            character.setPersonality(request.getPersonality());
        }
        if (request.getBackground() != null) {
            character.setBackground(request.getBackground());
        }

        characterService.updateById(character);

        return Result.success(character);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        Character character = characterService.getById(id);

        if (character == null) {
            throw new BusinessException(404, "角色不存在");
        }
        checkOwnership(character, userId);

        characterService.removeById(id);

        return Result.success();
    }

    private void checkOwnership(Character character, Long userId) {
        Novel novel = novelService.getById(character.getNovelId());
        if (novel == null || !novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的角色");
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
