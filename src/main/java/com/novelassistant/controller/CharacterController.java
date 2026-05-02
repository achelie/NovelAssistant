package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.entity.Character;
import com.novelassistant.service.CharacterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/character")
@RequiredArgsConstructor
public class CharacterController {

    private final CharacterService characterService;

    @PostMapping
    public Result<Character> create(@RequestBody Character character) {
        characterService.save(character);
        return Result.success(character);
    }

    @GetMapping("/{id}")
    public Result<Character> getById(@PathVariable Long id) {
        return Result.success(characterService.getById(id));
    }

    @GetMapping("/novel/{novelId}")
    public Result<List<Character>> listByNovel(@PathVariable Long novelId) {
        return Result.success(characterService.listByNovelId(novelId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Character character) {
        character.setId(id);
        characterService.updateById(character);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        characterService.removeById(id);
        return Result.success();
    }
}
