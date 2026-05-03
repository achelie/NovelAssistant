package com.novelassistant.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novelassistant.entity.Novel;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface NovelMapper extends BaseMapper<Novel> {
}
