import type { Operator } from './models'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: Operator
}

export interface ApiError {
  code: string
  message: string
  details?: Array<{ field: string; issue: string }>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
}
