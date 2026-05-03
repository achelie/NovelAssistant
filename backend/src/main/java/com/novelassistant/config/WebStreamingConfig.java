package com.novelassistant.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 流式接口禁用反向代理/中间件缓冲，避免长 SSE 在约 1KB 处「卡住」不刷新到浏览器。
 */
@Configuration
public class WebStreamingConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                if (!"POST".equalsIgnoreCase(request.getMethod())) {
                    return true;
                }
                String uri = request.getRequestURI();
                if (uri != null && uri.contains("/writing/generate")) {
                    response.setHeader("X-Accel-Buffering", "no");
                    response.setHeader("Cache-Control", "no-cache, no-transform");
                }
                return true;
            }
        });
    }
}
