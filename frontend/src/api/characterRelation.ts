import request from './request'
import type {
  ApiResult,
  CharacterRelation,
  CreateCharacterRelationRequest,
  UpdateCharacterRelationRequest,
} from '../types'

export function listCharacterRelationsByNovel(novelId: number) {
  return request.get<any, ApiResult<CharacterRelation[]>>(`/character-relation/novel/${novelId}`)
}

export function getCharacterRelation(id: number) {
  return request.get<any, ApiResult<CharacterRelation>>(`/character-relation/${id}`)
}

export function createCharacterRelation(data: CreateCharacterRelationRequest) {
  return request.post<any, ApiResult<CharacterRelation>>('/character-relation', data)
}

export function updateCharacterRelation(id: number, data: UpdateCharacterRelationRequest) {
  return request.put<any, ApiResult<CharacterRelation>>(`/character-relation/${id}`, data)
}

export function deleteCharacterRelation(id: number) {
  return request.delete<any, ApiResult<void>>(`/character-relation/${id}`)
}
