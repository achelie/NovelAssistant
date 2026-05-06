package com.novelassistant.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * React Router 使用 Browser History 时，刷新 /chapters 这类深链接需要回退到 index.html。
 * 仅转发“非 /api 且不包含文件扩展名”的路径，避免影响静态资源与后端接口。
 */
@Controller
public class SpaForwardController {

    @RequestMapping(value = {
            // Spring Boot 3 默认使用 PathPatternParser，不允许 `/**/{var...}` 这种写法。
            // 这里改为 `{path}/**`（** 必须在末尾）并排除常见静态资源前缀。
            "/{path:^(?!api$|assets$)[^\\.]*}",
            "/{path:^(?!api$|assets$)[^\\.]*}/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}

