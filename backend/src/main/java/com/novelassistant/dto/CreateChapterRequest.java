package com.novelassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateChapterRequest {

    @NotNull(message = "小说ID不能为空")
    private Long novelId;

    @NotBlank(message = "章节标题不能为空")
    private String title;

    @NotBlank(message = "章节内容不能为空")
    private String content;

    private Integer chapterIndex;
}
