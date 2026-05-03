package com.novelassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCharacterRequest {

    @NotNull(message = "小说ID不能为空")
    private Long novelId;

    @NotBlank(message = "角色名称不能为空")
    private String name;

    private String description;

    private String personality;

    private String background;
}
