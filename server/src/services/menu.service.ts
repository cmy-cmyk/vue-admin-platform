import { query } from '../config/db';
import { Menu, MenuTreeNode } from '../types';

// 把扁平的菜单列表构造成树
export function buildMenuTree(menus: Menu[], parentId = 0): MenuTreeNode[] {
  return menus
    .filter((m) => m.parent_id === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map((m) => ({
      ...m,
      children: buildMenuTree(menus, m.id).length ? buildMenuTree(menus, m.id) : undefined,
    }));
}

// 根据 role_id 列表查询可见菜单(目录 + 菜单,不含按钮)
export async function getMenusByRoleIds(roleIds: number[]): Promise<Menu[]> {
  if (roleIds.length === 0) return [];
  const placeholders = roleIds.map(() => '?').join(',');
  const sql = `
    SELECT DISTINCT m.*
    FROM menu m
    JOIN role_menu rm ON rm.menu_id = m.id
    WHERE rm.role_id IN (${placeholders})
      AND m.menu_type IN (0, 1)
      AND m.visible = 1
    ORDER BY m.parent_id, m.sort
  `;
  return query<Menu>(sql, roleIds);
}

// 根据 role_id 列表查询所有权限串(含按钮 + 菜单的 permiss)
export async function getPermissionsByRoleIds(roleIds: number[]): Promise<string[]> {
  if (roleIds.length === 0) return [];
  const placeholders = roleIds.map(() => '?').join(',');
  const sql = `
    SELECT DISTINCT m.permiss
    FROM menu m
    JOIN role_menu rm ON rm.menu_id = m.id
    WHERE rm.role_id IN (${placeholders})
      AND m.permiss IS NOT NULL AND m.permiss != ''
  `;
  const rows = await query<{ permiss: string }>(sql, roleIds);
  return rows.map((r) => r.permiss);
}
