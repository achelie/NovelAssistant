import request from './request'
import type { ApiResult, WorldSetting } from '../types'

export function listWorldSettingsByNovel(novelId: number) {
  return request.get<any, ApiResult<WorldSetting[]>>(`/world-setting/novel/${novelId}`)
}

export function getWorldSetting(id: number) {
  return request.get<any, ApiResult<WorldSetting>>(`/world-setting/${id}`)
}

export function createWorldSetting(data: Partial<WorldSetting>) {
  return request.post<any, ApiResult<WorldSetting>>('/world-setting', data)
}

export function updateWorldSetting(id: number, data: Partial<WorldSetting>) {
  return request.put<any, ApiResult<void>>(`/world-setting/${id}`, data)
}

export function deleteWorldSetting(id: number) {
  return request.delete<any, ApiResult<void>>(`/world-setting/${id}`)
}
