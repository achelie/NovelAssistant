package com.novelassistant.service;

import java.util.List;

public interface ChunkService {

    /**
     * 将长文本按段落分块，每块约 500 字，重叠 100 字
     */
    List<String> splitText(String text);
}
