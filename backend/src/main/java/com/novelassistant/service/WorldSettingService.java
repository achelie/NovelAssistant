package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.entity.WorldSetting;

import java.util.List;

public interface WorldSettingService extends IService<WorldSetting> {

    List<WorldSetting> listByNovelId(Long novelId);
}
