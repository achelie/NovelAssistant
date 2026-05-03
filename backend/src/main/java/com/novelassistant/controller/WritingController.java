package com.novelassistant.controller;

import com.novelassistant.common.Result;
import com.novelassistant.dto.WritingPromptPreviewResponse;
import com.novelassistant.dto.WritingRequest;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.WritingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/writing")
@RequiredArgsConstructor
public class WritingController {

    private final WritingService writingService;

    /**
     * SSE 流式续写接口
     * 前端通过 EventSource 或 fetch 接收逐 token 推送
     */
    @PostMapping(value = "/generate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generate(@Valid @RequestBody WritingRequest request) {
        Long userId = getCurrentUserId();
        return writingService.generateStream(request, userId);
    }

    /**
     * 预览最终拼装的 Prompt（不调用大模型；摘要过长时仅截断，不触发压缩模型）
     */
    @PostMapping("/preview-prompt")
    public Result<WritingPromptPreviewResponse> previewPrompt(@Valid @RequestBody WritingRequest request) {
        Long userId = getCurrentUserId();
        return Result.success(writingService.previewPrompts(request, userId));
    }

    /**
     * 手动触发章节内容向量化（用于 RAG 索引）
     */
    @PostMapping("/embed-chapter/{chapterId}")
    public Result<Void> embedChapter(@PathVariable Long chapterId) {
        Long userId = getCurrentUserId();
        writingService.embedChapter(chapterId, userId);
        return Result.success();
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new BusinessException(401, "请先登录");
        }
        return (Long) authentication.getPrincipal();
    }
}
