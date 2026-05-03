package com.novelassistant.service;

/**
 * 上下文构建核心模块：将用户勾选的素材 + RAG 检索结果组装为结构化 Prompt
 */
public interface ContextBuilderService {

    /**
     * 构建系统提示词（角色设定）
     */
    String buildSystemPrompt();

    /**
     * 构建用户提示词（包含所有上下文 + 章纲）
     */
    String buildUserPrompt(WritingContext context);

    /**
     * 上下文数据载体
     */
    record WritingContext(
            Long novelId,
            java.util.List<Long> summaryIds,
            java.util.List<Long> characterIds,
            java.util.List<Long> worldSettingIds,
            java.util.List<Long> characterRelationIds,
            java.util.List<Long> plotTimelineIds,
            String chapterOutline
    ) {}
}
