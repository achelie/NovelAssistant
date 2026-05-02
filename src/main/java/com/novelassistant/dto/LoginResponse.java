package com.novelassistant.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {

    private String token;
    private Long userId;
    private String username;
    private String email;
    private String avatarUrl;
}
