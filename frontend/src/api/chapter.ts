import request from './request'
import type {
  ApiResult,
  Chapter,
  CreateChapterRequest,
  UpdateChapterRequest,
} from '../types'

export function listChaptersByNovel(novelId: number) {
  return request.get<any, ApiResult<Chapter[]>>(`/chapter/novel/${novelId}`)
}

export function getChapter(id: number) {
  return request.get<any, ApiResult<Chapter>>(`/chapter/${id}`)
}

export function createChapter(data: CreateChapterRequest) {
  return request.post<any, ApiResult<Chapter>>('/chapter', data)
}

export function updateChapter(id: number, data: UpdateChapterRequest) {
  return request.put<any, ApiResult<Chapter>>(`/chapter/${id}`, data)
}

export function deleteChapter(id: number) {
  return request.delete<any, ApiResult<void>>(`/chapter/${id}`)
}
