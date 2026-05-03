package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.dto.CreateCharacterRelationRequest;
import com.novelassistant.dto.UpdateCharacterRelationRequest;
import com.novelassistant.entity.CharacterRelation;
import com.novelassistant.entity.Novel;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.CharacterRelationService;
import com.novelassistant.service.CharacterService;
import com.novelassistant.service.NovelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/character-relation")
@RequiredArgsConstructor
public class CharacterRelationController {

    private final CharacterRelationService characterRelationService;
    private final CharacterService characterService;
    private final NovelService novelService;

    @PostMapping
    public Result<CharacterRelation> create(@Valid @RequestBody CreateCharacterRelationRequest request) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(request.getNovelId(), userId);

        if (request.getCharacterAId().equals(request.getCharacterBId())) {
            throw new BusinessException(400, "角色A和角色B不能是同一个角色");
        }
        validateCharacterBelongsToNovel(request.getCharacterAId(), request.getNovelId());
        validateCharacterBelongsToNovel(request.getCharacterBId(), request.getNovelId());

        CharacterRelation relation = new CharacterRelation();
        relation.setNovelId(request.getNovelId());
        relation.setCharacterAId(request.getCharacterAId());
        relation.setCharacterBId(request.getCharacterBId());
        relation.setRelationType(request.getRelationType());
        relation.setDescription(request.getDescription());

        characterRelationService.save(relation);

        return Result.success(relation);
    }

    @GetMapping("/{id}")
    public Result<CharacterRelation> getById(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        CharacterRelation relation = characterRelationService.getById(id);
        if (relation == null) {
            throw new BusinessException(404, "角色关系不存在");
        }
        checkNovelOwnership(relation.getNovelId(), userId);

        return Result.success(relation);
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<CharacterRelation>> listByNovel(@PathVariable Long novelId) {
        Long userId = getCurrentUserId();
        checkNovelOwnership(novelId, userId);

        return Result.success(characterRelationService.listByNovelId(novelId));
    }

    @GetMapping("/character/{characterId}")
    public Result<List<CharacterRelation>> listByCharacter(@PathVariable Long characterId) {
        Long userId = getCurrentUserId();

        com.novelassistant.entity.Character character = characterService.getById(characterId);
        if (character == null) {
            throw new BusinessException(404, "角色不存在");
        }
        checkNovelOwnership(character.getNovelId(), userId);

        return Result.success(characterRelationService.listByCharacterId(characterId));
    }

    @PutMapping("/{id}")
    public Result<CharacterRelation> update(@PathVariable Long id,
                                            @Valid @RequestBody UpdateCharacterRelationRequest request) {
        Long userId = getCurrentUserId();
        CharacterRelation relation = characterRelationService.getById(id);
        if (relation == null) {
            throw new BusinessException(404, "角色关系不存在");
        }
        checkNovelOwnership(relation.getNovelId(), userId);

        if (StringUtils.hasText(request.getRelationType())) {
            relation.setRelationType(request.getRelationType());
        }
        if (request.getDescription() != null) {
            relation.setDescription(request.getDescription());
        }

        characterRelationService.updateById(relation);

        return Result.success(relation);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        CharacterRelation relation = characterRelationService.getById(id);
        if (relation == null) {
            throw new BusinessException(404, "角色关系不存在");
        }
        checkNovelOwnership(relation.getNovelId(), userId);

        characterRelationService.removeById(id);

        return Result.success();
    }

    private void checkNovelOwnership(Long novelId, Long userId) {
        Novel novel = novelService.getById(novelId);
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的角色关系");
        }
    }

    private void validateCharacterBelongsToNovel(Long characterId, Long novelId) {
        com.novelassistant.entity.Character character = characterService.getById(characterId);
        if (character == null) {
            throw new BusinessException(404, "角色(ID=" + characterId + ")不存在");
        }
        if (!character.getNovelId().equals(novelId)) {
            throw new BusinessException(400, "角色(ID=" + characterId + ")不属于该小说");
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
