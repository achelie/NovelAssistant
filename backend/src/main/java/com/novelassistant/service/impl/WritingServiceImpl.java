package com.novelassistant.service.impl;

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
        Novel novel = novelService.getById(request.getNovelId());
        if (novel == null) {
            throw new BusinessException(404, "小说不存在");
        }
        if (!novel.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权操作他人的小说");
        }

        WritingContext context = new WritingContext(
                request.getNovelId(),
                nullToEmpty(request.getSummaryIds()),
                nullToEmpty(request.getCharacterIds()),
                nullToEmpty(request.getWorldSettingIds()),
                nullToEmpty(request.getCharacterRelationIds()),
                nullToEmpty(request.getPlotTimelineIds()),
                request.getChapterOutline()
        );

        String systemPrompt = contextBuilderService.buildSystemPrompt();
        String userPrompt = contextBuilderService.buildUserPrompt(context);

        log.info("续写请求: novelId={}, promptLength={}", request.getNovelId(), userPrompt.length());

        return zhipuAiService.chatStream(systemPrompt, userPrompt);
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
