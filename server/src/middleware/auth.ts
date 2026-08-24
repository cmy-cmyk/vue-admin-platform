import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { unauthorized } from '../utils/response';

// 扩展 Express Request 类型,挂载当前用户
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// 必须登录中间件:从 Authorization: Bearer xxx 取 access token 验证
export function authRequired(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return unauthorized(res);
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (e) {
    // token 过期或非法,前端拦截器会触发 refresh 流程
    return unauthorized(res, 'access token 已过期');
  }
}

// 可选登录:有 token 就解析,没有也放行(用于公开接口同时识别登录态)
export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // 静默忽略,不阻断请求
    }
  }
  next();
}
