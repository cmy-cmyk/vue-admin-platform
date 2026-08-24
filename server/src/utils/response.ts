import { Response } from 'express';

// 统一业务响应结构,前端拦截器以此判断成功/失败
// { code: 0, message: 'ok', data: ... }  —— code === 0 表示成功
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export function success<T>(res: Response, data: T, message = 'ok') {
  return res.json({ code: 0, message, data } as ApiResponse<T>);
}

export function fail(res: Response, message: string, code = 1, status = 400) {
  return res.status(status).json({ code, message, data: null } as ApiResponse);
}

// 401 鉴权失败专用,前端会触发跳登录 / 续期流程
export function unauthorized(res: Response, message = '未登录或登录已过期') {
  return res.status(401).json({ code: 401, message, data: null } as ApiResponse);
}
