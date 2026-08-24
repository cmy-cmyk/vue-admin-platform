import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, query } from '../config/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt';
import { success, fail, unauthorized } from '../utils/response';
import { SafeUser, LoginResult, UserInfoResult } from '../types';
import { getMenusByRoleIds, getPermissionsByRoleIds, buildMenuTree } from '../services/menu.service';

// POST /api/auth/login
// body: { username, password }
// 返回: { accessToken, refreshToken, userInfo }
export async function login(req: Request, res: Response) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return fail(res, '用户名和密码不能为空');
  }

  const user = await queryOne<any>(
    'SELECT * FROM user WHERE username = ? AND status = 1 LIMIT 1',
    [username]
  );
  if (!user) {
    return fail(res, '用户不存在或已被禁用');
  }

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    return fail(res, '密码错误');
  }

  const payload: JwtPayload = { userId: user.id, username: user.username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const { password: _pwd, ...safeUser } = user;
  const result: LoginResult = { accessToken, refreshToken, userInfo: safeUser as SafeUser };

  return success(res, result, '登录成功');
}

// POST /api/auth/refresh
// body: { refreshToken }
// 返回: { accessToken }  —— 用 refresh 换新的 access
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return unauthorized(res, '缺少 refreshToken');
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ userId: payload.userId, username: payload.username });
    return success(res, { accessToken }, '刷新成功');
  } catch (e) {
    // refresh 也过期了 —— 必须重新登录
    return unauthorized(res, 'refresh token 已过期,请重新登录');
  }
}

// GET /api/auth/user-info
// header: Authorization: Bearer <accessToken>
// 返回: { userInfo, roles, permissions, menus }
export async function userInfo(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    return unauthorized(res);
  }

  // 查用户
  const user = await queryOne<any>('SELECT * FROM user WHERE id = ? LIMIT 1', [userId]);
  if (!user) {
    return fail(res, '用户不存在');
  }
  const { password: _pwd, ...safeUser } = user;

  // 查角色
  const roles = await query<any>(
    'SELECT r.* FROM role r JOIN user_role ur ON ur.role_id = r.id WHERE ur.user_id = ? AND r.status = 1',
    [userId]
  );
  const roleIds = roles.map((r) => r.id);
  const roleKeys = roles.map((r) => r.role_key);

  // 查菜单 + 权限
  const menus = await getMenusByRoleIds(roleIds);
  const permissions = await getPermissionsByRoleIds(roleIds);
  const menuTree = buildMenuTree(menus);

  const result: UserInfoResult = {
    userInfo: safeUser as SafeUser,
    roles: roleKeys,
    permissions,
    menus: menuTree,
  };

  return success(res, result);
}

// POST /api/auth/logout
export async function logout(_req: Request, res: Response) {
  // 简化版:前端直接清 token 即可
  // 完整版应把 refresh token 加入黑名单(Redis),改造点3再做
  return success(res, null, '退出成功');
}

// POST /api/auth/change-password
// body: { oldPassword, newPassword }
// 个人中心自助改密:校验旧密码 → 更新新密码
export async function changePassword(req: Request, res: Response) {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return fail(res, '旧密码和新密码不能为空');
  }
  if (newPassword.length < 6) {
    return fail(res, '新密码长度不能少于 6 位');
  }

  const userId = req.user?.userId ?? 0;
  if (!userId) {
    return unauthorized(res);
  }

  // 1. 查当前密码哈希
  const user = await queryOne<{ password: string }>(
    'SELECT password FROM user WHERE id = ?',
    [userId]
  );
  if (!user) {
    return fail(res, '用户不存在', 1, 404);
  }

  // 2. 校验旧密码
  const ok = bcrypt.compareSync(oldPassword, user.password);
  if (!ok) {
    return fail(res, '旧密码错误');
  }

  // 3. 更新为新密码哈希
  const hash = bcrypt.hashSync(newPassword, 10);
  await queryOne<any>(
    'UPDATE user SET password = ? WHERE id = ?',
    [hash, userId]
  );

  return success(res, null, '密码修改成功,请重新登录');
}
