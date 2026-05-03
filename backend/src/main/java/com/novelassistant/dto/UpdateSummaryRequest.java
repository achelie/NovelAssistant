package com.novelassistant.dto;

import lombok.Data;

@Data
public class UpdateSummaryRequest {

    private String title;

    private Integer chapterIndex;

    private String content;
}
