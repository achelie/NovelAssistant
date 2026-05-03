package com.novelassistant.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WritingPromptPreviewResponse {

    private String systemPrompt;

    private String userPrompt;

    /** 便于直接阅读的拼接文本 */
    private String fullText;
}
