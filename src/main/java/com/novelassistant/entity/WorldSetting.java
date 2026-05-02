package com.novelassistant.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("world_setting")
public class WorldSetting {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long novelId;

    private String title;

    private String content;

    /** 类型：地理、魔法、科技、历史 */
    private String type;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
