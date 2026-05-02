package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.entity.CharacterRelation;

import java.util.List;

public interface CharacterRelationService extends IService<CharacterRelation> {

    List<CharacterRelation> listByNovelId(Long novelId);
}
