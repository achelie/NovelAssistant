package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Chapter;
import com.novelassistant.entity.Character;
import com.novelassistant.entity.CharacterRelation;
import com.novelassistant.entity.Novel;
import com.novelassistant.entity.PlotTimeline;
import com.novelassistant.entity.Summary;
import com.novelassistant.entity.TextChunk;
import com.novelassistant.entity.WorldSetting;
import com.novelassistant.mapper.NovelMapper;
import com.novelassistant.mapper.TextChunkMapper;
import com.novelassistant.service.ChapterService;
import com.novelassistant.service.CharacterRelationService;
import com.novelassistant.service.CharacterService;
import com.novelassistant.service.NovelService;
import com.novelassistant.service.PlotTimelineService;
import com.novelassistant.service.SummaryService;
import com.novelassistant.service.WorldSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NovelServiceImpl extends ServiceImpl<NovelMapper, Novel> implements NovelService {

    private final ChapterService chapterService;
    private final SummaryService summaryService;
    private final CharacterService characterService;
    private final CharacterRelationService characterRelationService;
    private final WorldSettingService worldSettingService;
    private final PlotTimelineService plotTimelineService;
    private final TextChunkMapper textChunkMapper;

    @Override
    public List<Novel> listByUserId(Long userId) {
        return list(new LambdaQueryWrapper<Novel>()
                .eq(Novel::getUserId, userId)
                .orderByDesc(Novel::getUpdatedAt));
    }

    @Override
    public PageResult<Novel> pageQuery(Long userId, int page, int pageSize, String keyword) {
        LambdaQueryWrapper<Novel> wrapper = new LambdaQueryWrapper<Novel>()
                .eq(Novel::getUserId, userId);

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

    @Override
    @Transactional
    public boolean removeNovelCascade(Long novelId) {
        // 先删关联表，避免残留孤儿数据
        chapterService.remove(new LambdaQueryWrapper<Chapter>().eq(Chapter::getNovelId, novelId));
        summaryService.remove(new LambdaQueryWrapper<Summary>().eq(Summary::getNovelId, novelId));
        characterRelationService.remove(new LambdaQueryWrapper<CharacterRelation>().eq(CharacterRelation::getNovelId, novelId));
        characterService.remove(new LambdaQueryWrapper<Character>().eq(Character::getNovelId, novelId));
        worldSettingService.remove(new LambdaQueryWrapper<WorldSetting>().eq(WorldSetting::getNovelId, novelId));
        plotTimelineService.remove(new LambdaQueryWrapper<PlotTimeline>().eq(PlotTimeline::getNovelId, novelId));
        textChunkMapper.delete(new LambdaQueryWrapper<TextChunk>().eq(TextChunk::getNovelId, novelId));

        return super.removeById(novelId);
    }
}
