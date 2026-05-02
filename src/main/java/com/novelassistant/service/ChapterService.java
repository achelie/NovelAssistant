package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.entity.Chapter;

import java.util.List;

public interface ChapterService extends IService<Chapter> {

    List<Chapter> listByNovelId(Long novelId);
}
