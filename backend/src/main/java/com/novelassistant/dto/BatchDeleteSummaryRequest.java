package com.novelassistant.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BatchDeleteSummaryRequest {

    @NotNull(message = "小说ID不能为空")
    private Long novelId;

    @NotEmpty(message = "请选择要删除的摘要")
    private List<Long> summaryIds;
}

