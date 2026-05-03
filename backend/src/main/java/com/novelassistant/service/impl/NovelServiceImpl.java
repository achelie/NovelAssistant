package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Novel;
import com.novelassistant.mapper.NovelMapper;
import com.novelassistant.service.NovelService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class NovelServiceImpl extends ServiceImpl<NovelMapper, Novel> implements NovelService {

    @Override
    public List<Novel> listByUserId(Long userId) {
        return list(new LambdaQueryWrapper<Novel>()
                .eq(Novel::getUserId, userId)
                .orderByDesc(Novel::getUpdatedAt));
    }

    @Override
    public PageResult<Novel> pageQuery(int page, int pageSize, String keyword) {
        LambdaQueryWrapper<Novel> wrapper = new LambdaQueryWrapper<>();

        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w
                    .like(Novel::getTitle, keyword)
                    .or()
                    .like(Novel::getDescription, keyword));
        }

        wrapper.orderByDesc(Novel::getUpdatedAt);

        Page<Novel> pageResult = page(new Page<>(page, pageSize), wrapper);

        return PageResult.of(pageResult.getTotal(), pageResult.getCurrent(),
                pageResult.getSize(), pageResult.getRecords());
    }
}
