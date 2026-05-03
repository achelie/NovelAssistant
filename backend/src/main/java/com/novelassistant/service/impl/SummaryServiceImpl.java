package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.entity.Summary;
import com.novelassistant.mapper.SummaryMapper;
import com.novelassistant.service.SummaryService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SummaryServiceImpl extends ServiceImpl<SummaryMapper, Summary> implements SummaryService {

    @Override
    public List<Summary> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<Summary>()
                .eq(Summary::getNovelId, novelId)
                .orderByAsc(Summary::getChapterIndex));
    }
}
