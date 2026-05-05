package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Novel;

import java.util.List;

public interface NovelService extends IService<Novel> {

    List<Novel> listByUserId(Long userId);

    PageResult<Novel> pageQuery(Long userId, int page, int pageSize, String keyword);

    /**
     * 删除小说并清理其下所有关联数据，避免产生孤儿数据。
     */
    boolean removeNovelCascade(Long novelId);
}
