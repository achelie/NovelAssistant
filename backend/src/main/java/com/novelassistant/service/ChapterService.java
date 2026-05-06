package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Chapter;

import java.util.List;

public interface ChapterService extends IService<Chapter> {

    List<Chapter> listByNovelId(Long novelId);

    PageResult<Chapter> pageByUserId(int page, int pageSize, Long userId);

    /**
     * 同一小说下章节序号是否已被占用。
     * @param excludeId 更新场景传当前章节ID；创建场景传 null
     */
    boolean existsChapterIndex(Long novelId, Integer chapterIndex, Long excludeId);
}
