import { Request, Response } from 'express';
import { query, queryOne } from '../config/db';
import { success, fail } from '../utils/response';

// GET /api/role/list  —— 全部角色(下拉用,不分页)
export async function getRoleList(_req: Request, res: Response) {
    const list = await query<any>(
        'SELECT id, role_name, role_key, status, remark, created_at FROM role ORDER BY id ASC'
    );
    return success(res, list);
}

// GET /api/role/page?page=1&pageSize=10&keyword=xxx
export async function getRolePage(req: Request, res: Response) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const keyword = (req.query.keyword as string) || '';
    const offset = (page - 1) * pageSize;

    const like = `%${keyword}%`;
    const where = keyword ? 'WHERE role_name LIKE ? OR role_key LIKE ?' : '';
    const params = keyword ? [like, like] : [];

    const list = await query<any>(
        `SELECT id, role_name, role_key, status, remark, created_at FROM role ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
    );
    const totalRow = await queryOne<any>(`SELECT COUNT(*) as total FROM role ${where}`, params);

    return success(res, { list, total: totalRow?.total || 0, page, pageSize });
}

// POST /api/role  body: { role_name, role_key, remark, status }
export async function createRole(req: Request, res: Response) {
    const { role_name, role_key, remark = '', status = 1 } = req.body || {};
    if (!role_name || !role_key) return fail(res, '角色名和标识不能为空');

    const exists = await queryOne<any>('SELECT id FROM role WHERE role_key = ? LIMIT 1', [role_key]);
    if (exists) return fail(res, 'role_key 已存在');

    const result: any = await queryOne<any>(
        'INSERT INTO role (role_name, role_key, remark, status) VALUES (?, ?, ?, ?) RETURNING id',
        [role_name, role_key, remark, status ? 1 : 0]
    );
    return success(res, { id: result?.id }, '创建成功');
}

// PUT /api/role/:id
export async function updateRole(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { role_name, role_key, remark, status } = req.body || {};
    await queryOne<any>(
        'UPDATE role SET role_name = ?, role_key = ?, remark = ?, status = ? WHERE id = ?',
        [role_name || '', role_key || '', remark || '', status ?? 1, id]
    );
    return success(res, null, '更新成功');
}

// DELETE /api/role/:id
export async function deleteRole(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    if (id === 1) return fail(res, '不允许删除超级管理员角色');

    // 检查是否还有用户绑定
    const bound = await queryOne<any>('SELECT COUNT(*) as c FROM user_role WHERE role_id = ?', [id]);
    if (bound?.c > 0) return fail(res, `该角色下还有 ${bound.c} 个用户,不能删除`);

    await queryOne<any>('DELETE FROM role WHERE id = ?', [id]);
    await queryOne<any>('DELETE FROM role_menu WHERE role_id = ?', [id]);
    return success(res, null, '删除成功');
}

// GET /api/role/:id/menus  —— 查角色已分配的菜单 id 列表
export async function getRoleMenus(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const rows = await query<any>('SELECT menu_id FROM role_menu WHERE role_id = ?', [id]);
    return success(res, rows.map((r) => r.menu_id));
}

// PUT /api/role/:id/menus  body: { menuIds: [1,2,3,...] }
export async function assignRoleMenus(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { menuIds = [] }: { menuIds: number[] } = req.body || {};

    await queryOne<any>('DELETE FROM role_menu WHERE role_id = ?', [id]);
    if (menuIds.length > 0) {
        const values = menuIds.map((mid) => `(${id}, ${Number(mid)})`).join(',');
        await query(`INSERT INTO role_menu (role_id, menu_id) VALUES ${values}`);
    }
    return success(res, null, '权限分配成功');
}
