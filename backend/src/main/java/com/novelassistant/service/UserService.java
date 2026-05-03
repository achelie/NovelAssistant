package com.novelassistant.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novelassistant.entity.User;

public interface UserService extends IService<User> {

    User getByUsername(String username);

    User getByEmail(String email);
}
