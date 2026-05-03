package com.novelassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class WritingRequest {

    @NotNull(message = "小说ID不能为空")
    private Long novelId;

    @Size(max = 20, message = "最多只能勾选20章摘要")
    private List<Long> summaryIds;

    private List<Long> characterIds;

    private List<Long> worldSettingIds;

    private List<Long> characterRelationIds;

    @NotBlank(message = "章纲不能为空")
    private String chapterOutline;

    private String chapterTitle;

    private Integer chapterIndex;
}
