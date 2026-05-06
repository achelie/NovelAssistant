package com.novelassistant.config;

import io.netty.channel.ChannelOption;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.zhipu")
public class ZhipuAiConfig {

    private String apiKey;
    private String baseUrl;
    private String chatModel;
    private String embeddingModel;

    /** 未指定时流式/同步补全的最大 token 上限（智谱缺省约 1024，长文会过早截断） */
    private int defaultMaxCompletionTokens = 8192;

    /** 单次请求 max_tokens 硬上限，避免超出模型能力 */
    private int maxCompletionTokensCeiling = 16384;

    @Bean("zhipuWebClient")
    public WebClient zhipuWebClient() {
        HttpClient httpClient = HttpClient.create()
                // AI 生成耗时较长，超时策略按原值上调 10 倍
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 150_000)
                .responseTimeout(Duration.ofMinutes(50));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
                .build();
    }
}
