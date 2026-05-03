package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.entity.Summary;

import java.util.List;

public interface SummaryService extends IService<Summary> {

    List<Summary> listByNovelId(Long novelId);
}
