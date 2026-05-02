package com.novelassistant.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novelassistant.entity.WorldSetting;
import com.novelassistant.mapper.WorldSettingMapper;
import com.novelassistant.service.WorldSettingService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WorldSettingServiceImpl
        extends ServiceImpl<WorldSettingMapper, WorldSetting>
        implements WorldSettingService {

    @Override
    public List<WorldSetting> listByNovelId(Long novelId) {
        return list(new LambdaQueryWrapper<WorldSetting>()
                .eq(WorldSetting::getNovelId, novelId));
    }
}
