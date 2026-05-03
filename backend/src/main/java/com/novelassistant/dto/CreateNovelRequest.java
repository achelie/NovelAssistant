package com.novelassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateNovelRequest {

    @NotBlank(message = "小说标题不能为空")
    @Size(max = 200, message = "标题长度不能超过200个字符")
    private String title;

    private String description;

    private String coverUrl;
}
