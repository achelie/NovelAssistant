import request from './request'
import type {
  ApiResult,
  Character,
  CreateCharacterRequest,
  PageResult,
  UpdateCharacterRequest,
} from '../types'

export function listCharacters(page = 1, pageSize = 50) {
  return request.get<any, ApiResult<PageResult<Character>>>('/character', {
    params: { page, pageSize },
  })
}

export function getCharacter(id: number) {
  return request.get<any, ApiResult<Character>>(`/character/${id}`)
}

export function createCharacter(data: CreateCharacterRequest) {
  return request.post<any, ApiResult<Character>>('/character', data)
}

export function updateCharacter(id: number, data: UpdateCharacterRequest) {
  return request.put<any, ApiResult<Character>>(`/character/${id}`, data)
}

export function deleteCharacter(id: number) {
  return request.delete<any, ApiResult<void>>(`/character/${id}`)
}
