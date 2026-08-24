import request from '@/utils/request';
import type { ApiResponse } from '@/utils/request';

export interface UserItem {
    id: number;
    username: string;
    nickname: string;
    email: string;
    phone: string;
    avatar: string;
    status: number;
    created_at?: string;
    roles?: Array<{ id: number; role_name: string; role_key: string }>;
}

export interface UserListResult {
    list: UserItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface UserListParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
}

export interface CreateUserParams {
    username: string;
    password: string;
    nickname?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    status?: number;
    roleIds?: number[];
}

export function getUserListApi(params: UserListParams) {
    return request.get<any, ApiResponse<UserListResult>>('/user/list', { params });
}

export function createUserApi(data: CreateUserParams) {
    return request.post<any, ApiResponse<{ id: number }>>('/user', data);
}

export function updateUserApi(id: number, data: Partial<Omit<UserItem, 'id' | 'username'>>) {
    return request.put<any, ApiResponse<null>>(`/user/${id}`, data);
}

export function deleteUserApi(id: number) {
    return request.delete<any, ApiResponse<null>>(`/user/${id}`);
}

export function batchDeleteUserApi(ids: number[]) {
    return request.post<any, ApiResponse<null>>('/user/batch', { ids });
}

export function updateUserStatusApi(id: number, status: number) {
    return request.put<any, ApiResponse<null>>(`/user/${id}/status`, { status });
}

export function resetUserPasswordApi(id: number, password: string) {
    return request.put<any, ApiResponse<null>>(`/user/${id}/reset-password`, { password });
}

export function assignUserRolesApi(id: number, roleIds: number[]) {
    return request.put<any, ApiResponse<null>>(`/user/${id}/roles`, { roleIds });
}
