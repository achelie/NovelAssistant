package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Character;
import com.novelassistant.entity.Novel;
import com.novelassistant.mapper.CharacterMapper;
import com.novelassistant.mapper.NovelMapper;
import com.novelassistant.service.CharacterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CharacterServiceImpl extends ServiceImpl<CharacterMapper, Character> implements CharacterService {

    private final NovelMapper novelMapper;

    @Override
    public List<Character> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<Character>()
                .eq(Character::getNovelId, novelId)
                .orderByAsc(Character::getCreatedAt));
    }

    @Override
    public PageResult<Character> pageByUserId(int page, int pageSize, Long userId) {
        List<Long> novelIds = novelMapper.selectList(
                new LambdaQueryWrapper<Novel>().eq(Novel::getUserId, userId).select(Novel::getId)
        ).stream().map(Novel::getId).collect(Collectors.toList());

        if (novelIds.isEmpty()) {
            return PageResult.of(0, page, pageSize, Collections.emptyList());
        }

        LambdaQueryWrapper<Character> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(Character::getNovelId, novelIds);
        wrapper.orderByDesc(Character::getCreatedAt);

        Page<Character> pageParam = new Page<>(page, pageSize);
        Page<Character> result = this.page(pageParam, wrapper);

        return PageResult.of(result.getTotal(), result.getCurrent(), result.getSize(), result.getRecords());
    }
}
