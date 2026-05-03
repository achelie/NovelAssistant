package com.novelassistant.service;

import com.novelassistant.entity.TextChunk;

import java.util.List;

public interface EmbeddingService {

    /**
     * 将来源文本分块、向量化并持久化
     * @param novelId 小说ID
     * @param sourceType 来源类型（chapter/summary/world_setting）
     * @param sourceId 来源ID
     * @param text 原始文本
     */
    void indexText(Long novelId, String sourceType, Long sourceId, String text);

    /**
     * 删除指定来源的所有分块（用于更新前清理旧数据）
     */
    void removeBySource(String sourceType, Long sourceId);

    /**
     * 根据查询文本在指定小说中检索最相关的 topK 个文本块
     */
    List<TextChunk> search(Long novelId, String queryText, int topK);
}
