package com.novelassistant.service;

import reactor.core.publisher.Flux;

import java.util.List;

public interface ZhipuAiService {

    /**
     * 流式聊天：返回逐 token 的内容片段流（maxCompletionTokens 为 null 时使用配置默认）
     */
    default Flux<String> chatStream(String systemPrompt, String userPrompt) {
        return chatStream(systemPrompt, userPrompt, null);
    }

    Flux<String> chatStream(String systemPrompt, String userPrompt, Integer maxCompletionTokens);

    /**
     * 同步聊天：返回完整回复文本（用于摘要压缩等短文本场景）
     */
    String chat(String systemPrompt, String userPrompt);

    /**
     * 生成文本的 embedding 向量
     */
    float[] embed(String text);

    /**
     * 批量生成 embedding
     */
    List<float[]> embedBatch(List<String> texts);
}
