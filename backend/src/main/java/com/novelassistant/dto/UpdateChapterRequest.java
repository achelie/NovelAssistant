package com.novelassistant.dto;

import lombok.Data;

@Data
public class UpdateChapterRequest {

    private String title;

    private String content;

    private Integer chapterIndex;
}
