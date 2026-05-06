package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.novelassistant.entity.TextChunk;
import com.novelassistant.mapper.TextChunkMapper;
import com.novelassistant.service.ChunkService;
import com.novelassistant.service.EmbeddingService;
import com.novelassistant.service.ZhipuAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingServiceImpl implements EmbeddingService {

    private final ChunkService chunkService;
    private final ZhipuAiService zhipuAiService;
    private final TextChunkMapper textChunkMapper;

    @Override
    @Transactional
    public void indexText(Long novelId, String sourceType, Long sourceId, String text) {
        removeBySource(sourceType, sourceId);

        List<String> chunks = chunkService.splitText(text);
        if (chunks.isEmpty()) return;

        for (String chunkText : chunks) {
            float[] embedding = zhipuAiService.embed(chunkText);

            TextChunk textChunk = new TextChunk();
            textChunk.setNovelId(novelId);
            textChunk.setSourceType(sourceType);
            textChunk.setSourceId(sourceId);
            textChunk.setChunkText(chunkText);
            textChunk.setEmbedding(floatArrayToBytes(embedding));

            textChunkMapper.insert(textChunk);
        }

        log.info("已索引 {} 个文本块: novelId={}, sourceType={}, sourceId={}",
                chunks.size(), novelId, sourceType, sourceId);
    }

    @Override
    @Transactional
    public void removeBySource(String sourceType, Long sourceId) {
        textChunkMapper.delete(new LambdaQueryWrapper<TextChunk>()
                .eq(TextChunk::getSourceType, sourceType)
                .eq(TextChunk::getSourceId, sourceId));
    }

    @Override
    @Transactional
    public void removeBySourceIds(String sourceType, List<Long> sourceIds) {
        if (sourceIds == null || sourceIds.isEmpty()) return;
        textChunkMapper.delete(new LambdaQueryWrapper<TextChunk>()
                .eq(TextChunk::getSourceType, sourceType)
                .in(TextChunk::getSourceId, sourceIds));
    }

    @Override
    public List<TextChunk> search(Long novelId, String queryText, int topK) {
        float[] queryEmbedding = zhipuAiService.embed(queryText);

        List<TextChunk> allChunks = textChunkMapper.selectList(
                new LambdaQueryWrapper<TextChunk>()
                        .eq(TextChunk::getNovelId, novelId)
                        .isNotNull(TextChunk::getEmbedding));

        if (allChunks.isEmpty()) return List.of();

        // 余弦相似度排序（等价于 FAISS IndexFlatIP）
        List<Map.Entry<TextChunk, Double>> scored = allChunks.stream()
                .map(chunk -> {
                    float[] chunkEmbedding = bytesToFloatArray(chunk.getEmbedding());
                    double similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
                    return Map.entry(chunk, similarity);
                })
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(topK)
                .collect(Collectors.toList());

        return scored.stream()
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    private double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) return 0.0;
        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator == 0.0 ? 0.0 : dotProduct / denominator;
    }

    private byte[] floatArrayToBytes(float[] floats) {
        ByteBuffer buffer = ByteBuffer.allocate(floats.length * 4).order(ByteOrder.LITTLE_ENDIAN);
        for (float f : floats) {
            buffer.putFloat(f);
        }
        return buffer.array();
    }

    private float[] bytesToFloatArray(byte[] bytes) {
        ByteBuffer buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN);
        float[] floats = new float[bytes.length / 4];
        for (int i = 0; i < floats.length; i++) {
            floats[i] = buffer.getFloat();
        }
        return floats;
    }
}
