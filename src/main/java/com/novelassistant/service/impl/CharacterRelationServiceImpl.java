package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.entity.CharacterRelation;
import com.novelassistant.mapper.CharacterRelationMapper;
import com.novelassistant.service.CharacterRelationService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CharacterRelationServiceImpl
        extends ServiceImpl<CharacterRelationMapper, CharacterRelation>
        implements CharacterRelationService {

    @Override
    public List<CharacterRelation> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<CharacterRelation>()
                .eq(CharacterRelation::getNovelId, novelId));
    }
}
