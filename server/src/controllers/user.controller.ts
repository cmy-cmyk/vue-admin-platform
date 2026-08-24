import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db';
import { success, fail } from '../utils/response';

// GET /api/user/list?page=1&pageSize=10&keyword=xxx
export async function getUserList(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const keyword = (req.query.keyword as string) || '';
    const offset = (page - 1) * pageSize;

    const like = `%${keyword}%`;
    const where = keyword ? 'WHERE username LIKE ? OR nickname LIKE ? OR phone LIKE ?' : '';
    const params = keyword ? [like, like, like] : [];

    const listSql = `SELECT id, username, nickname, email, phone, avatar, status, created_at FROM user ${where} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const list = await query<any>(listSql, [...params, pageSize, offset]);

    const totalSql = `SELECT COUNT(*) as total FROM user ${where}`;
    const totalRow = await queryOne<any>(totalSql, params);
    const total = totalRow?.total || 0;

    // 附带每个用户的角色(简化版:一次查询所有相关 user_role + role,在内存里 group)
    const userIds = list.map((u: any) => u.id);
    let userRolesMap: Record<number, any[]> = {};
    if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        const rows = await query<any>(
            `SELECT ur.user_id, r.id as role_id, r.role_name, r.role_key
             FROM user_role ur JOIN role r ON r.id = ur.role_id
             WHERE ur.user_id IN (${placeholders})`,
            userIds
        );
        userRolesMap = rows.reduce((acc: any, row: any) => {
            (acc[row.user_id] = acc[row.user_id] || []).push({
                id: row.role_id,
                role_name: row.role_name,
                role_key: row.role_key,
            });
            return acc;
        }, {});
    }

    const listWithRoles = list.map((u: any) => ({
        ...u,
        roles: userRolesMap[u.id] || [],
    }));

    return success(res, { list: listWithRoles, total, page, pageSize });
}

// POST /api/user  body: { username, password, nickname, email, phone, roleIds }
export async function createUser(req: Request, res: Response) {
    const { username, password, nickname = '', email = '', phone = '', avatar = '', status = 1, roleIds = [] } = req.body || {};
    if (!username || !password) {
        return fail(res, '用户名和密码不能为空');
    }

    const exists = await queryOne<any>('SELECT id FROM user WHERE username = ? LIMIT 1', [username]);
    if (exists) {
        return fail(res, '用户名已存在');
    }

    const hash = bcrypt.hashSync(password, 10);
    const result: any = await queryOne<any>(
        'INSERT INTO user (username, password, nickname, email, phone, avatar, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
        [username, hash, nickname, email, phone, avatar, status]
    );
    const newId = result?.id;
    if (!newId) {
        return fail(res, '新增失败');
    }

    // 分配角色
    if (roleIds.length > 0) {
        const values = roleIds.map((rid: number) => `(${newId}, ${Number(rid)})`).join(',');
        await query(`INSERT INTO user_role (user_id, role_id) VALUES ${values}`);
    }

    return success(res, { id: newId }, '创建成功');
}

// PUT /api/user/:id  body: { nickname, email, phone, avatar, status }
export async function updateUser(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { nickname, email, phone, avatar, status } = req.body || {};

    await queryOne<any>(
        'UPDATE user SET nickname = ?, email = ?, phone = ?, avatar = ?, status = ? WHERE id = ?',
        [nickname || '', email || '', phone || '', avatar || '', status ?? 1, id]
    );
    return success(res, null, '更新成功');
}

// DELETE /api/user/:id
export async function deleteUser(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    if (id === 1) {
        return fail(res, '不允许删除超级管理员');
    }
    await queryOne<any>('DELETE FROM user WHERE id = ?', [id]);
    await queryOne<any>('DELETE FROM user_role WHERE user_id = ?', [id]);
    return success(res, null, '删除成功');
}

// POST /api/user/batch  body: { ids: [1,2,3] }
export async function batchDeleteUser(req: Request, res: Response) {
    const ids: number[] = req.body?.ids || [];
    if (ids.length === 0) return fail(res, 'ids 不能为空');
    if (ids.includes(1)) return fail(res, '不允许删除超级管理员');
    const placeholders = ids.map(() => '?').join(',');
    await query(`DELETE FROM user WHERE id IN (${placeholders})`, ids);
    await query(`DELETE FROM user_role WHERE user_id IN (${placeholders})`, ids);
    return success(res, null, `批量删除 ${ids.length} 条`);
}

// PUT /api/user/:id/status  body: { status: 0/1 }
export async function updateUserStatus(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { status } = req.body || {};
    await queryOne<any>('UPDATE user SET status = ? WHERE id = ?', [status ? 1 : 0, id]);
    return success(res, null, '状态已更新');
}

// PUT /api/user/:id/reset-password  body: { password }
export async function resetUserPassword(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { password } = req.body || {};
    if (!password) return fail(res, '密码不能为空');
    const hash = bcrypt.hashSync(password, 10);
    await queryOne<any>('UPDATE user SET password = ? WHERE id = ?', [hash, id]);
    return success(res, null, '密码已重置');
}

// GET /api/user/:id/roles
export async function getUserRoles(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const roles = await query<any>(
        `SELECT r.id, r.role_name, r.role_key FROM user_role ur
         JOIN role r ON r.id = ur.role_id WHERE ur.user_id = ?`,
        [id]
    );
    return success(res, roles);
}

// PUT /api/user/:id/roles  body: { roleIds: [1,2] }
export async function assignUserRoles(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { roleIds = [] }: { roleIds: number[] } = req.body || {};

    // 简单事务:删旧 + 加新(SQLite 用 BEGIN/COMMIT)
    await queryOne<any>('DELETE FROM user_role WHERE user_id = ?', [id]);
    if (roleIds.length > 0) {
        const values = roleIds.map((rid) => `(${id}, ${Number(rid)})`).join(',');
        await query(`INSERT INTO user_role (user_id, role_id) VALUES ${values}`);
    }
    return success(res, null, '角色分配成功');
}
