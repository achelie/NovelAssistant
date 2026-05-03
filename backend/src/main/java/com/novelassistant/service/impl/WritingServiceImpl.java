package com.novelassistant.service.impl;

import com.novelassistant.dto.WritingPromptPreviewResponse;
import com.novelassistant.dto.WritingRequest;
import com.novelassistant.entity.Chapter;
import com.novelassistant.entity.Novel;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.*;
import com.novelassistant.service.ContextBuilderService.WritingContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WritingServiceImpl implements WritingService {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final ContextBuilderService contextBuilderService;
    private final ZhipuAiService zhipuAiService;
    private final EmbeddingService embeddingService;

    @Override
    public Flux<String> generateStream(WritingRequest request, Long userId) {
        assertNovelAccess(request.getNovelId(), userId);

        WritingContext context = buildWritingContext(request, false);

        String systemPrompt = contextBuilderService.buildSystemPrompt();
        String userPrompt = contextBuilderService.buildUserPrompt(context);

        int maxTokens = estimateCompletionTokens(context.targetWordCount());
        log.info("续写请求: novelId={}, promptLength={}, maxTokens={}", request.getNovelId(), userPrompt.length(), maxTokens);

        return zhipuAiService.chatStream(systemPrompt, userPrompt, maxTokens);
    }

    /**
     * 按目标汉字数量估算 completion token（中文约 1.5～2 token/字，取 3 倍并设上下限）
     */
    private static int estimateCompletionTokens(int targetChineseChars) {
        return Math.min(16384, Math.max(2048, targetChineseChars * 3));
    }

    @Override
    public WritingPromptPreviewResponse previewPrompts(WritingRequest request, Long userId) {
        assertNovelAccess(request.getNovelId(), userId);

        WritingContext context = buildWritingContext(request, true);

        String systemPrompt = contextBuilderService.buildSystemPrompt();
        String userPrompt = contextBuilderService.buildUserPrompt(context);

        String fullText = "===== 系统提示词（system） =====\n\n"
                + systemPrompt
                + "\n\n===== 用户提示词（user） =====\n\n"
                + userPrompt;

        return new WritingPromptPreviewResponse(systemPrompt, userPrompt, fullText);
    }

    private void assertNovelAccess(Long novelId, Long userId) {
        Novel novel = novelService.getById(novelId);
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的小说");
        }
    }

    private WritingContext buildWritingContext(WritingRequest request, boolean skipLlmCompression) {
        String style = request.getWritingStyle() != null ? request.getWritingStyle().trim() : "";
        return new WritingContext(
                request.getNovelId(),
                nullToEmpty(request.getSummaryIds()),
                nullToEmpty(request.getCharacterIds()),
                nullToEmpty(request.getWorldSettingIds()),
                nullToEmpty(request.getCharacterRelationIds()),
                nullToEmpty(request.getPlotTimelineIds()),
                request.getChapterOutline(),
                style,
                normalizeTargetWordCount(request.getTargetWordCount()),
                skipLlmCompression
        );
    }

    private static int normalizeTargetWordCount(Integer w) {
        if (w == null) {
            return 3000;
        }
        if (w == 2000 || w == 3000 || w == 4000) {
            return w;
        }
        return 3000;
    }

    @Override
    public void embedChapter(Long chapterId, Long userId) {
        Chapter chapter = chapterService.getById(chapterId);
        if (chapter == null) {
            throw new BusinessException(404, "章节不存在");
        }

        Novel novel = novelService.getById(chapter.getNovelId());
        if (novel == null || !novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的章节");
        }

        if (chapter.getContent() == null || chapter.getContent().isBlank()) {
            throw new BusinessException(400, "章节内容为空，无法向量化");
        }

        embeddingService.indexText(chapter.getNovelId(), "chapter", chapterId, chapter.getContent());
    }

    private <T> List<T> nullToEmpty(List<T> list) {
        return list != null ? list : List.of();
    }
}
