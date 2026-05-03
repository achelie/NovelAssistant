package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.common.PageResult;
import com.novelassistant.entity.Character;

import java.util.List;

public interface CharacterService extends IService<Character> {

    List<Character> listByNovelId(Long novelId);

    PageResult<Character> pageByUserId(int page, int pageSize, Long userId);
}
