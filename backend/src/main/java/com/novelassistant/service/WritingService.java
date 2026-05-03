package com.novelassistant.service;

import com.novelassistant.dto.WritingRequest;
import reactor.core.publisher.Flux;

public interface WritingService {

    /**
     * 流式续写：返回逐 token 的内容流
     */
    Flux<String> generateStream(WritingRequest request, Long userId);

    /**
     * 对指定章节内容进行向量化索引
     */
    void embedChapter(Long chapterId, Long userId);
}
