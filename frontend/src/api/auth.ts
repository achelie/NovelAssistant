import request from './request'
import type { ApiResult, LoginRequest, LoginResponse, RegisterRequest } from '../types'

export function loginApi(data: LoginRequest) {
  return request.post<any, ApiResult<LoginResponse>>('/auth/login', data)
}

export function registerApi(data: RegisterRequest) {
  return request.post<any, ApiResult<void>>('/auth/register', data)
}
