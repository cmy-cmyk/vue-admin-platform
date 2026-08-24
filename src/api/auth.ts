import request from '@/utils/request';
import type { ApiResponse } from '@/utils/request';

export interface LoginParams {
    username: string;
    password: string;
}

export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    userInfo: {
        id: number;
        username: string;
        nickname: string;
        email: string;
        phone: string;
        avatar: string;
        status: number;
    };
}

export interface MenuTreeNode {
    id: number;
    parent_id: number;
    menu_name: string;
    menu_type: number;
    path: string;
    component: string;
    icon: string;
    permiss: string;
    sort: number;
    visible: number;
    children?: MenuTreeNode[];
}

export interface UserInfoResult {
    userInfo: LoginResult['userInfo'];
    roles: string[];
    permissions: string[];
    menus: MenuTreeNode[];
}

// POST /auth/login
export function loginApi(data: LoginParams) {
    return request.post<any, ApiResponse<LoginResult>>('/auth/login', data);
}

// POST /auth/refresh
export function refreshApi(refreshToken: string) {
    return request.post<any, ApiResponse<{ accessToken: string }>>('/auth/refresh', {
        refreshToken
    });
}

// GET /auth/user-info —— 拿当前用户的菜单 + 权限
export function getUserInfoApi() {
    return request.get<any, ApiResponse<UserInfoResult>>('/auth/user-info');
}

// POST /auth/logout
export function logoutApi() {
    return request.post<any, ApiResponse<null>>('/auth/logout');
}

// POST /auth/change-password —— 个人中心自助改密
export function changePasswordApi(data: { oldPassword: string; newPassword: string }) {
    return request.post<any, ApiResponse<null>>('/auth/change-password', data);
}
