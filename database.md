用户表： id(主键),username(用户名，唯一),email(邮箱，唯一),password(密码，加密存储),avatar_url,created_at,updated_at
小说表： id(主键),user_id,title,description,cover_url,status,word_count,created_at,updated_at
章节表： id(主键),novel_id,title,chapter_index(第几章),created_at,updated_at
角色表： id(主键),novel_id,name,description,personality,background,created_at,updated_at
人物关系表: id(主键),novel_id,character_a_id,character_b_id,relation_type,description,created_at
世界设计表：id(主键),novel_id,title,content,type(地理，魔法，科技，历史),created_at
剧情时间线：id(主键),novel_id,title,description,event_time,related_characters,created_at
