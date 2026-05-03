package com.novelassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCharacterRelationRequest {

    @NotNull(message = "小说ID不能为空")
    private Long novelId;

    @NotNull(message = "角色A的ID不能为空")
    private Long characterAId;

    @NotNull(message = "角色B的ID不能为空")
    private Long characterBId;

    @NotBlank(message = "关系类型不能为空")
    private String relationType;

    private String description;
}
