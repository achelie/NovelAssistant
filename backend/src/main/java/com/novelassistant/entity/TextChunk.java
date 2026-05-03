package com.novelassistant.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("text_chunk")
public class TextChunk {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long novelId;

    private String sourceType;

    private Long sourceId;

    private String chunkText;

    private byte[] embedding;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
