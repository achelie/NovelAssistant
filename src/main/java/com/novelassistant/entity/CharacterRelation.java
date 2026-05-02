package com.novelassistant.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("character_relation")
public class CharacterRelation {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long novelId;

    private Long characterAId;

    private Long characterBId;

    private String relationType;

    private String description;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
