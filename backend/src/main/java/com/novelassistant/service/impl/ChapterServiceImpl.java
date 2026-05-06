package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Chapter;
import com.novelassistant.entity.Novel;
import com.novelassistant.mapper.ChapterMapper;
import com.novelassistant.mapper.NovelMapper;
import com.novelassistant.service.ChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChapterServiceImpl extends ServiceImpl<ChapterMapper, Chapter> implements ChapterService {

    private final NovelMapper novelMapper;

    @Override
    public List<Chapter> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<Chapter>()
                .eq(Chapter::getNovelId, novelId)
                .orderByAsc(Chapter::getChapterIndex));
    }

    @Override
    public PageResult<Chapter> pageByUserId(int page, int pageSize, Long userId) {
        List<Long> novelIds = novelMapper.selectList(
                new LambdaQueryWrapper<Novel>().eq(Novel::getUserId, userId).select(Novel::getId)
        ).stream().map(Novel::getId).collect(Collectors.toList());

        if (novelIds.isEmpty()) {
            return PageResult.of(0, page, pageSize, Collections.emptyList());
        }

        LambdaQueryWrapper<Chapter> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(Chapter::getNovelId, novelIds);
        wrapper.orderByDesc(Chapter::getCreatedAt);

        Page<Chapter> pageParam = new Page<>(page, pageSize);
        Page<Chapter> result = this.page(pageParam, wrapper);

        return PageResult.of(result.getTotal(), result.getCurrent(), result.getSize(), result.getRecords());
    }

    @Override
    public boolean existsChapterIndex(Long novelId, Integer chapterIndex, Long excludeId) {
        if (novelId == null || chapterIndex == null) return false;
        LambdaQueryWrapper<Chapter> w = new LambdaQueryWrapper<Chapter>()
                .eq(Chapter::getNovelId, novelId)
                .eq(Chapter::getChapterIndex, chapterIndex);
        if (excludeId != null) {
            w.ne(Chapter::getId, excludeId);
        }
        return exists(w);
    }
}
