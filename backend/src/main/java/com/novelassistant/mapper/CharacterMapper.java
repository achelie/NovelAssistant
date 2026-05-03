package com.novelassistant.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novelassistant.entity.Character;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CharacterMapper extends BaseMapper<Character> {
}
