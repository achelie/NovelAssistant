package com.novelassistant.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class GenerateSummaryRequest {

    @NotNull(message = "小说ID不能为空")
    private Long novelId;

    @NotEmpty(message = "请至少选择一个章节")
    private List<Long> chapterIds;

    private String title;
}
