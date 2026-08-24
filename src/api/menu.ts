import request from '@/utils/request';
import type { ApiResponse } from '@/utils/request';
import type { MenuTreeNode } from './auth';

export interface MenuItem {
    id: number;
    parent_id: number;
    menu_name: string;
    menu_type: number; // 0 目录 1 菜单 2 按钮
    path: string;
    component: string;
    icon: string;
    permiss: string;
    sort: number;
    visible: number;
    created_at?: string;
}

export interface MenuTreeNodePlus extends MenuItem {
    children?: MenuTreeNodePlus[];
}

export function getMenuTreeApi() {
    return request.get<any, ApiResponse<MenuTreeNodePlus[]>>('/menu/tree');
}

export function getMenuListApi() {
    return request.get<any, ApiResponse<MenuItem[]>>('/menu/list');
}

export function createMenuApi(data: Omit<MenuItem, 'id' | 'created_at'>) {
    return request.post<any, ApiResponse<{ id: number }>>('/menu', data);
}

export function updateMenuApi(id: number, data: Omit<MenuItem, 'id' | 'created_at'>) {
    return request.put<any, ApiResponse<null>>(`/menu/${id}`, data);
}

export function deleteMenuApi(id: number) {
    return request.delete<any, ApiResponse<null>>(`/menu/${id}`);
}
