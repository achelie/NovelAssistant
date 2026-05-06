package com.novelassistant.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Extract plain text from ProseMirror/Tiptap JSON content.
 * Falls back to treating input as plain text if parsing fails.
 */
public class ProseMirrorTextUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ProseMirrorTextUtil() {
    }

    public static String extractPlainText(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String trimmed = raw.trim();

        // If it doesn't look like JSON, treat as plain text.
        if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
            return raw;
        }

        try {
            JsonNode root = MAPPER.readTree(trimmed);
            StringBuilder sb = new StringBuilder(Math.min(trimmed.length(), 16_384));
            walk(root, sb);
            return rtrim(sb.toString());
        } catch (Exception ignored) {
            return raw;
        }
    }

    public static int countChars(String raw) {
        String text = extractPlainText(raw);
        return text == null ? 0 : text.length();
    }

    private static void walk(JsonNode node, StringBuilder out) {
        if (node == null || node.isNull()) return;

        JsonNode typeNode = node.get("type");
        String type = typeNode != null && typeNode.isTextual() ? typeNode.asText() : null;

        if ("hardBreak".equals(type)) {
            out.append('\n');
            return;
        }

        JsonNode textNode = node.get("text");
        if (textNode != null && textNode.isTextual()) {
            out.append(textNode.asText());
        }

        JsonNode content = node.get("content");
        if (content != null && content.isArray()) {
            for (JsonNode child : content) {
                walk(child, out);
            }
        }
    }

    private static String rtrim(String s) {
        int end = s.length();
        while (end > 0) {
            char c = s.charAt(end - 1);
            if (c != ' ' && c != '\n' && c != '\r' && c != '\t') break;
            end--;
        }
        return end == s.length() ? s : s.substring(0, end);
    }
}

