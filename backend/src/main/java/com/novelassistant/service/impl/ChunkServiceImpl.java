package com.novelassistant.service.impl;

import com.novelassistant.service.ChunkService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChunkServiceImpl implements ChunkService {

    private static final int CHUNK_SIZE = 500;
    private static final int OVERLAP = 100;

    @Override
    public List<String> splitText(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        text = text.strip();
        if (text.length() <= CHUNK_SIZE) {
            return List.of(text);
        }

        // 先按段落分割，再合并到目标大小
        String[] paragraphs = text.split("\\n+");
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();

        for (String paragraph : paragraphs) {
            paragraph = paragraph.strip();
            if (paragraph.isEmpty()) continue;

            if (current.length() + paragraph.length() + 1 > CHUNK_SIZE && current.length() > 0) {
                chunks.add(current.toString().strip());
                // 重叠：保留末尾部分
                String overlap = extractOverlap(current.toString());
                current = new StringBuilder(overlap);
            }
            if (current.length() > 0) {
                current.append("\n");
            }
            current.append(paragraph);
        }

        if (current.length() > 0) {
            chunks.add(current.toString().strip());
        }

        // 如果段落分割后还有超长块，按固定窗口二次切分
        List<String> result = new ArrayList<>();
        for (String chunk : chunks) {
            if (chunk.length() <= CHUNK_SIZE * 1.5) {
                result.add(chunk);
            } else {
                result.addAll(splitByWindow(chunk));
            }
        }

        return result;
    }

    private String extractOverlap(String text) {
        if (text.length() <= OVERLAP) {
            return text;
        }
        String tail = text.substring(text.length() - OVERLAP);
        int sentenceBreak = findSentenceBreak(tail);
        if (sentenceBreak > 0) {
            return tail.substring(sentenceBreak);
        }
        return tail;
    }

    private List<String> splitByWindow(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());
            chunks.add(text.substring(start, end).strip());
            start = end - OVERLAP;
            if (start < 0) start = 0;
            if (end == text.length()) break;
        }
        return chunks;
    }

    private int findSentenceBreak(String text) {
        char[] breaks = {'。', '！', '？', '；', '.', '!', '?', ';', '\n'};
        for (char b : breaks) {
            int idx = text.indexOf(b);
            if (idx >= 0) return idx + 1;
        }
        return -1;
    }
}
