-- 创建数据库
CREATE DATABASE IF NOT EXISTS novel_assistant
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE novel_assistant;

SET NAMES utf8mb4;

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `username`   VARCHAR(50)  NOT NULL COMMENT '用户名',
    `email`      VARCHAR(100) NOT NULL COMMENT '邮箱',
    `password`   VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
    `avatar_url` VARCHAR(500)          DEFAULT NULL COMMENT '头像地址',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 小说表
CREATE TABLE IF NOT EXISTS `novel` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`     BIGINT       NOT NULL COMMENT '所属用户',
    `title`       VARCHAR(200) NOT NULL COMMENT '小说标题',
    `description` TEXT                  DEFAULT NULL COMMENT '小说简介',
    `cover_url`   VARCHAR(500)          DEFAULT NULL COMMENT '封面地址',
    `status`      VARCHAR(20)  NOT NULL DEFAULT 'draft' COMMENT '状态：draft/ongoing/completed',
    `word_count`  INT          NOT NULL DEFAULT 0 COMMENT '总字数',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说表';

-- 章节表
CREATE TABLE IF NOT EXISTS `chapter` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT,
    `novel_id`      BIGINT       NOT NULL COMMENT '所属小说',
    `title`         VARCHAR(200) NOT NULL COMMENT '章节标题',
    `chapter_index` INT          NOT NULL COMMENT '章节序号',
    `content`       LONGTEXT              DEFAULT NULL COMMENT '章节内容',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_novel_id` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节表';

-- 角色表（避免与 MySQL 关键字冲突，使用 character_info）
CREATE TABLE IF NOT EXISTS `character_info` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `novel_id`    BIGINT       NOT NULL COMMENT '所属小说',
    `name`        VARCHAR(100) NOT NULL COMMENT '角色名',
    `description` TEXT                  DEFAULT NULL COMMENT '角色描述',
    `personality` TEXT                  DEFAULT NULL COMMENT '性格特征',
    `background`  TEXT                  DEFAULT NULL COMMENT '背景故事',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_novel_id` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 人物关系表
CREATE TABLE IF NOT EXISTS `character_relation` (
    `id`             BIGINT      NOT NULL AUTO_INCREMENT,
    `novel_id`       BIGINT      NOT NULL COMMENT '所属小说',
    `character_a_id` BIGINT      NOT NULL COMMENT '角色A',
    `character_b_id` BIGINT      NOT NULL COMMENT '角色B',
    `relation_type`  VARCHAR(50) NOT NULL COMMENT '关系类型',
    `description`    TEXT                 DEFAULT NULL COMMENT '关系描述',
    `created_at`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_novel_id` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='人物关系表';

-- 世界设定表
CREATE TABLE IF NOT EXISTS `world_setting` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT,
    `novel_id`   BIGINT       NOT NULL COMMENT '所属小说',
    `title`      VARCHAR(200) NOT NULL COMMENT '设定标题',
    `content`    TEXT                  DEFAULT NULL COMMENT '设定内容',
    `type`       VARCHAR(50)  NOT NULL COMMENT '类型：地理/魔法/科技/历史',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_novel_id` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='世界设定表';

-- 剧情时间线表
CREATE TABLE IF NOT EXISTS `plot_timeline` (
    `id`                 BIGINT       NOT NULL AUTO_INCREMENT,
    `novel_id`           BIGINT       NOT NULL COMMENT '所属小说',
    `title`              VARCHAR(200) NOT NULL COMMENT '事件标题',
    `description`        TEXT                  DEFAULT NULL COMMENT '事件描述',
    `event_time`         VARCHAR(100)          DEFAULT NULL COMMENT '事件时间（故事内时间）',
    `related_characters` VARCHAR(500)          DEFAULT NULL COMMENT '相关角色ID，逗号分隔',
    `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_novel_id` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='剧情时间线表';

-- 摘要表
CREATE TABLE IF NOT EXISTS `summary` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT,
    `novel_id`      BIGINT       NOT NULL COMMENT '所属小说',
    `title`         VARCHAR(200) NOT NULL COMMENT '摘要标题',
    `chapter_index` INT          NOT NULL COMMENT '章节序号',
    `content`       TEXT                  DEFAULT NULL COMMENT '摘要内容',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_novel_id` (`novel_id`),
    KEY `idx_chapter_index` (`chapter_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='摘要表';

-- 文本分块与向量表（RAG用）
CREATE TABLE IF NOT EXISTS `text_chunk` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `novel_id`    BIGINT       NOT NULL COMMENT '所属小说',
    `source_type` VARCHAR(20)  NOT NULL COMMENT '来源类型：chapter/summary/world_setting',
    `source_id`   BIGINT       NOT NULL COMMENT '来源ID',
    `chunk_text`  TEXT         NOT NULL COMMENT '分块文本',
    `embedding`   MEDIUMBLOB            DEFAULT NULL COMMENT '向量 float[] 序列化',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_novel_id` (`novel_id`),
    KEY `idx_source` (`source_type`, `source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文本分块与向量表';
