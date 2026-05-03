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

    private static final int TOKENS_PER_ROUND = 4096;
    private static final int CONTINUATION_TAIL_CHARS = 800;

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

        int targetChars = context.targetWordCount();
        int maxRounds = targetChars <= 2000 ? 2 : 3;

        log.info("续写请求: novelId={}, targetChars={}, maxRounds={}", request.getNovelId(), targetChars, maxRounds);

        StringBuffer accumulated = new StringBuffer();
        return streamRound(systemPrompt, userPrompt, accumulated, targetChars, 1, maxRounds);
    }

    private Flux<String> streamRound(String systemPrompt, String baseUserPrompt,
                                     StringBuffer accumulated, int targetChars,
                                     int round, int maxRounds) {
        String userPrompt;
        int roundTokens;

        if (round == 1) {
            userPrompt = baseUserPrompt;
            roundTokens = TOKENS_PER_ROUND;
        } else {
            String tail = getTail(accumulated.toString(), CONTINUATION_TAIL_CHARS);
            int remaining = targetChars - accumulated.length();
            userPrompt = buildContinuationPrompt(baseUserPrompt, tail, remaining);
            roundTokens = Math.min(TOKENS_PER_ROUND, Math.max(1024, remaining * 3));
        }

        return zhipuAiService.chatStream(systemPrompt, userPrompt, roundTokens)
                .doOnNext(chunk -> accumulated.append(chunk))
                .concatWith(Flux.defer(() -> {
                    int chars = accumulated.length();
                    log.info("第{}轮完成: 已生成{}字 / 目标{}字", round, chars, targetChars);
                    if (chars < targetChars * 0.85 && round < maxRounds) {
                        return streamRound(systemPrompt, baseUserPrompt, accumulated,
                                targetChars, round + 1, maxRounds);
                    }
                    return Flux.empty();
                }));
    }

    private static String buildContinuationPrompt(String baseUserPrompt, String tailText, int remainingChars) {
        return baseUserPrompt + "\n\n" +
                "【已完成部分的结尾】\n" + tailText + "\n\n" +
                "【续写指令】\n" +
                "请紧接上文继续创作，不要重复已有内容，还需写约" + remainingChars + "字。" +
                "保持人物性格、文风和情节走向一致，直接输出续写正文，不要任何元信息或标题。";
    }

    private static String getTail(String text, int maxLen) {
        if (text.length() <= maxLen) return text;
        return "…" + text.substring(text.length() - maxLen);
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
