package com.novelassistant.common;

import lombok.Data;

import java.util.List;

@Data
public class PageResult<T> {

    private long total;
    private long page;
    private long size;
    private List<T> records;

    public static <T> PageResult<T> of(long total, long page, long size, List<T> records) {
        PageResult<T> pageResult = new PageResult<>();
        pageResult.setTotal(total);
        pageResult.setPage(page);
        pageResult.setSize(size);
        pageResult.setRecords(records);
        return pageResult;
    }
}
