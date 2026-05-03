import request from './request'
import type {
  ApiResult,
  CreateSummaryRequest,
  GenerateSummaryRequest,
  Summary,
  UpdateSummaryRequest,
} from '../types'

export function listSummariesByNovel(novelId: number) {
  return request.get<any, ApiResult<Summary[]>>(`/summary/novel/${novelId}`)
}

export function getSummary(id: number) {
  return request.get<any, ApiResult<Summary>>(`/summary/${id}`)
}

export function createSummary(data: CreateSummaryRequest) {
  return request.post<any, ApiResult<Summary>>('/summary', data)
}

export function updateSummary(id: number, data: UpdateSummaryRequest) {
  return request.put<any, ApiResult<Summary>>(`/summary/${id}`, data)
}

export function deleteSummary(id: number) {
  return request.delete<any, ApiResult<void>>(`/summary/${id}`)
}

export function generateSummary(data: GenerateSummaryRequest) {
  return request.post<any, ApiResult<Summary[]>>('/summary/generate', data)
}
