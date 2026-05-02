package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.entity.PlotTimeline;

import java.util.List;

public interface PlotTimelineService extends IService<PlotTimeline> {

    List<PlotTimeline> listByNovelId(Long novelId);
}
