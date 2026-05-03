package com.novelassistant.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("plot_timeline")
public class PlotTimeline {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long novelId;

    private String title;

    private String description;

    private String eventTime;

    private String relatedCharacters;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
