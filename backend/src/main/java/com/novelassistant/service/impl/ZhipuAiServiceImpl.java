package com.novelassistant.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.novelassistant.config.ZhipuAiConfig;
import com.novelassistant.exception.BusinessException;
import com.novelassistant.service.ZhipuAiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class ZhipuAiServiceImpl implements ZhipuAiService {

    private final WebClient webClient;
    private final ZhipuAiConfig config;
    private final ObjectMapper objectMapper;

    public ZhipuAiServiceImpl(@Qualifier("zhipuWebClient") WebClient webClient,
                               ZhipuAiConfig config,
                               ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.config = config;
        this.objectMapper = objectMapper;
    }

    @Override
    public Flux<String> chatStream(String systemPrompt, String userPrompt, Integer maxCompletionTokens) {
        ObjectNode body = buildChatBody(systemPrompt, userPrompt, true, maxCompletionTokens);

        return webClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body.toString())
                .retrieve()
                .bodyToFlux(String.class)
                .filter(data -> !"[DONE]".equals(data.trim()))
                .map(this::extractDeltaContent)
                .filter(content -> content != null && !content.isEmpty())
                .onErrorResume(e -> {
                    log.error("智谱AI流式调用失败", e);
                    return Flux.error(new BusinessException(500, "AI生成失败: " + e.getMessage()));
                });
    }

    @Override
    public String chat(String systemPrompt, String userPrompt) {
        ObjectNode body = buildChatBody(systemPrompt, userPrompt, false, null);

        try {
            String response = webClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body.toString())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("智谱AI同步调用失败", e);
            throw new BusinessException(500, "AI调用失败: " + e.getMessage());
        }
    }

    @Override
    public float[] embed(String text) {
        List<float[]> results = embedBatch(List.of(text));
        return results.get(0);
    }

    @Override
    public List<float[]> embedBatch(List<String> texts) {
        List<float[]> results = new ArrayList<>();
        // 智谱 embedding API 单次最多支持一个文本，逐个调用
        for (String text : texts) {
            results.add(callEmbeddingApi(text));
        }
        return results;
    }

    private float[] callEmbeddingApi(String text) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", config.getEmbeddingModel());
        body.put("input", text);

        try {
            String response = webClient.post()
                    .uri("/embeddings")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body.toString())
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(response);
            JsonNode embeddingNode = root.path("data").get(0).path("embedding");

            float[] embedding = new float[embeddingNode.size()];
            for (int i = 0; i < embeddingNode.size(); i++) {
                embedding[i] = (float) embeddingNode.get(i).asDouble();
            }
            return embedding;
        } catch (Exception e) {
            log.error("智谱AI Embedding调用失败", e);
            throw new BusinessException(500, "Embedding生成失败: " + e.getMessage());
        }
    }

    private ObjectNode buildChatBody(String systemPrompt, String userPrompt, boolean stream,
                                       Integer maxCompletionTokens) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", config.getChatModel());
        body.put("stream", stream);

        int maxTokens = maxCompletionTokens != null
                ? maxCompletionTokens
                : config.getDefaultMaxCompletionTokens();
        maxTokens = Math.min(Math.max(maxTokens, 256), config.getMaxCompletionTokensCeiling());
        body.put("max_tokens", maxTokens);

        ArrayNode messages = body.putArray("messages");

        ObjectNode systemMsg = objectMapper.createObjectNode();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        messages.add(systemMsg);

        ObjectNode userMsg = objectMapper.createObjectNode();
        userMsg.put("role", "user");
        userMsg.put("content", userPrompt);
        messages.add(userMsg);

        return body;
    }

    private String extractDeltaContent(String data) {
        try {
            JsonNode root = objectMapper.readTree(data);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("delta").path("content").asText("");
            }
            return "";
        } catch (Exception e) {
            log.debug("解析SSE数据失败: {}", data);
            return "";
        }
    }
}
