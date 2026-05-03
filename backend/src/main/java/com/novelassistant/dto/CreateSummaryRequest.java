package com.novelassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateSummaryRequest {

    @NotNull(message = "小说ID不能为空")
    private Long novelId;

    @NotBlank(message = "摘要标题不能为空")
    private String title;

    @NotNull(message = "章节序号不能为空")
    private Integer chapterIndex;

    private String content;
}
