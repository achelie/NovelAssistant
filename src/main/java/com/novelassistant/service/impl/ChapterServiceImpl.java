package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.entity.Chapter;
import com.novelassistant.mapper.ChapterMapper;
import com.novelassistant.service.ChapterService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ChapterServiceImpl extends ServiceImpl<ChapterMapper, Chapter> implements ChapterService {

    @Override
    public List<Chapter> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<Chapter>()
                .eq(Chapter::getNovelId, novelId)
                .orderByAsc(Chapter::getChapterIndex));
    }
}
