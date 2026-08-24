import request from '@/utils/request';
import type { ApiResponse } from '@/utils/request';

export interface RoleItem {
    id: number;
    role_name: string;
    role_key: string;
    status: number;
    remark: string;
    created_at?: string;
}

export function getRoleListApi() {
    return request.get<any, ApiResponse<RoleItem[]>>('/role/list');
}

export function getRolePageApi(params: { page: number; pageSize: number; keyword?: string }) {
    return request.get<any, ApiResponse<{ list: RoleItem[]; total: number }>>('/role/page', { params });
}

export function createRoleApi(data: Omit<RoleItem, 'id' | 'created_at'>) {
    return request.post<any, ApiResponse<{ id: number }>>('/role', data);
}

export function updateRoleApi(id: number, data: Omit<RoleItem, 'id' | 'created_at'>) {
    return request.put<any, ApiResponse<null>>(`/role/${id}`, data);
}

export function deleteRoleApi(id: number) {
    return request.delete<any, ApiResponse<null>>(`/role/${id}`);
}

export function getRoleMenusApi(id: number) {
    return request.get<any, ApiResponse<number[]>>(`/role/${id}/menus`);
}

export function assignRoleMenusApi(id: number, menuIds: number[]) {
    return request.put<any, ApiResponse<null>>(`/role/${id}/menus`, { menuIds });
}
