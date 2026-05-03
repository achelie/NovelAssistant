package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.entity.PlotTimeline;
import com.novelassistant.mapper.PlotTimelineMapper;
import com.novelassistant.service.PlotTimelineService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlotTimelineServiceImpl
        extends ServiceImpl<PlotTimelineMapper, PlotTimeline>
        implements PlotTimelineService {

    @Override
    public List<PlotTimeline> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<PlotTimeline>()
                .eq(PlotTimeline::getNovelId, novelId)
                .orderByAsc(PlotTimeline::getEventTime));
    }
}
