import { Request, Response } from 'express';
import { query, queryOne } from '../config/db';
import { success, fail } from '../utils/response';
import { buildMenuTree } from '../services/menu.service';
import type { Menu } from '../types';

// GET /api/menu/tree  —— 完整菜单树(菜单管理页用)
export async function getMenuTree(_req: Request, res: Response) {
    const menus = await query<Menu>(
        'SELECT * FROM menu ORDER BY parent_id ASC, sort ASC'
    );
    const tree = buildMenuTree(menus);
    return success(res, tree);
}

// GET /api/menu/list  —— 扁平列表(角色权限分配用,带按钮)
export async function getMenuList(_req: Request, res: Response) {
    const list = await query<Menu>(
        'SELECT id, parent_id, menu_name, menu_type, permiss FROM menu ORDER BY parent_id ASC, sort ASC'
    );
    return success(res, list);
}

// POST /api/menu  body: { parent_id, menu_name, menu_type, path, component, icon, permiss, sort, visible }
export async function createMenu(req: Request, res: Response) {
    const { parent_id = 0, menu_name, menu_type, path = '', component = '', icon = '', permiss = '', sort = 0, visible = 1 } = req.body || {};
    if (!menu_name) return fail(res, '菜单名不能为空');
    if (menu_type === 1 && !path) return fail(res, '菜单类型必须有路由 path');

    const result: any = await queryOne<any>(
        'INSERT INTO menu (parent_id, menu_name, menu_type, path, component, icon, permiss, sort, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
        [parent_id, menu_name, menu_type, path, component, icon, permiss, sort, visible ? 1 : 0]
    );
    return success(res, { id: result?.id }, '创建成功');
}

// PUT /api/menu/:id
export async function updateMenu(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const { parent_id, menu_name, menu_type, path, component, icon, permiss, sort, visible } = req.body || {};
    if (parent_id === id) return fail(res, '上级菜单不能是自己');

    await queryOne<any>(
        'UPDATE menu SET parent_id = ?, menu_name = ?, menu_type = ?, path = ?, component = ?, icon = ?, permiss = ?, sort = ?, visible = ? WHERE id = ?',
        [parent_id ?? 0, menu_name || '', menu_type ?? 1, path || '', component || '', icon || '', permiss || '', sort ?? 0, visible ?? 1, id]
    );
    return success(res, null, '更新成功');
}

// DELETE /api/menu/:id
export async function deleteMenu(req: Request, res: Response) {
    const id = parseInt(req.params.id);

    // 检查是否有子菜单
    const children = await queryOne<any>('SELECT COUNT(*) as c FROM menu WHERE parent_id = ?', [id]);
    if (children?.c > 0) return fail(res, `存在 ${children.c} 个子菜单,请先删除子菜单`);

    await queryOne<any>('DELETE FROM menu WHERE id = ?', [id]);
    await queryOne<any>('DELETE FROM role_menu WHERE menu_id = ?', [id]);
    return success(res, null, '删除成功');
}
