package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.entity.Novel;
import com.novelassistant.mapper.NovelMapper;
import com.novelassistant.service.NovelService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NovelServiceImpl extends ServiceImpl<NovelMapper, Novel> implements NovelService {

    @Override
    public List<Novel> listByUserId(Long userId) {
        return list(new LambdaQueryWrapper<Novel>()
                .eq(Novel::getUserId, userId)
                .orderByDesc(Novel::getUpdatedAt));
    }
}
