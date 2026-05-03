import request from './request'
import type {
  ApiResult,
  CreateNovelRequest,
  Novel,
  PageResult,
  UpdateNovelRequest,
} from '../types'

export function listNovels(page = 1, pageSize = 50, keyword?: string) {
  return request.get<any, ApiResult<PageResult<Novel>>>('/novel', {
    params: { page, pageSize, keyword },
  })
}

export function getNovel(id: number) {
  return request.get<any, ApiResult<Novel>>(`/novel/${id}`)
}

export function createNovel(data: CreateNovelRequest) {
  return request.post<any, ApiResult<Novel>>('/novel', data)
}

export function updateNovel(id: number, data: UpdateNovelRequest) {
  return request.put<any, ApiResult<Novel>>(`/novel/${id}`, data)
}

export function deleteNovel(id: number) {
  return request.delete<any, ApiResult<void>>(`/novel/${id}`)
}
