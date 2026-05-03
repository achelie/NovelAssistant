package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Novel;

import java.util.List;

public interface NovelService extends IService<Novel> {

    List<Novel> listByUserId(Long userId);

    PageResult<Novel> pageQuery(int page, int pageSize, String keyword);
}
