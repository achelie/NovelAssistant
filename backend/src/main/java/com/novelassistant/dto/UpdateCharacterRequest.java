package com.novelassistant.dto;

import lombok.Data;

@Data
public class UpdateCharacterRequest {

    private String name;

    private String description;

    private String personality;

    private String background;
}
