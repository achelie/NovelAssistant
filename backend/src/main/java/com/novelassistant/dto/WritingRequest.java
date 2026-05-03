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

    private List<Long> plotTimelineIds;

    @NotBlank(message = "章纲不能为空")
    private String chapterOutline;

    /** 文风描述，最多约 200 字 */
    @Size(max = 200, message = "文风描述不能超过200字")
    private String writingStyle;

    /** 目标字数：2000 / 3000 / 4000，缺省由服务端按 3000 处理 */
    private Integer targetWordCount;

    private String chapterTitle;

    private Integer chapterIndex;
}
