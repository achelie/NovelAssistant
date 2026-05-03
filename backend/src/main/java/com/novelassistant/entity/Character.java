package com.novelassistant.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

@Data
@TableName("character_info")
@Alias("CharacterEntity")
public class Character {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long novelId;

    private String name;

    private String description;

    private String personality;

    private String background;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
