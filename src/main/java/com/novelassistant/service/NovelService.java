package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.entity.Novel;

import java.util.List;

public interface NovelService extends IService<Novel> {

    List<Novel> listByUserId(Long userId);
}
