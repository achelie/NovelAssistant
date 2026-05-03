import request from './request'
import type { ApiResult, CreatePlotTimelineRequest, PlotTimeline, UpdatePlotTimelineRequest } from '../types'

export function listPlotTimelinesByNovel(novelId: number) {
  return request.get<any, ApiResult<PlotTimeline[]>>(`/plot-timeline/novel/${novelId}`)
}

export function getPlotTimeline(id: number) {
  return request.get<any, ApiResult<PlotTimeline>>(`/plot-timeline/${id}`)
}

export function createPlotTimeline(data: CreatePlotTimelineRequest) {
  return request.post<any, ApiResult<PlotTimeline>>('/plot-timeline', data)
}

export function updatePlotTimeline(id: number, data: UpdatePlotTimelineRequest) {
  return request.put<any, ApiResult<void>>(`/plot-timeline/${id}`, data)
}

export function deletePlotTimeline(id: number) {
  return request.delete<any, ApiResult<void>>(`/plot-timeline/${id}`)
}
