package com.novelassistant.dto;

import lombok.Data;

@Data
public class UpdateCharacterRelationRequest {

    private String relationType;

    private String description;
}
