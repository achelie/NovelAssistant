package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.entity.Character;
import com.novelassistant.mapper.CharacterMapper;
import com.novelassistant.service.CharacterService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CharacterServiceImpl extends ServiceImpl<CharacterMapper, Character> implements CharacterService {

    @Override
    public List<Character> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<Character>()
                .eq(Character::getNovelId, novelId)
                .orderByAsc(Character::getCreatedAt));
    }
}
