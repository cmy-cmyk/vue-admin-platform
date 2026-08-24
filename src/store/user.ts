import { defineStore } from 'pinia';
import {
    loginApi,
    getUserInfoApi,
    logoutApi,
    type LoginParams,
    type LoginResult,
    type UserInfoResult,
    type MenuTreeNode,
} from '@/api/auth';
import { tokenStorage } from '@/utils/request';

interface UserState {
    userInfo: LoginResult['userInfo'] | null;
    roles: string[];
    permissions: string[];
    menus: MenuTreeNode[];
    // 路由是否已动态加载,用于解决刷新白屏
    isRoutesLoaded: boolean;
}

export const useUserStore = defineStore('user', {
    state: (): UserState => ({
        userInfo: null,
        roles: [],
        permissions: [],
        menus: [],
        isRoutesLoaded: false,
    }),

    getters: {
        isLoggedIn: (state) => !!tokenStorage.getAccessToken(),
    },

    actions: {
        // 登录
        async login(params: LoginParams) {
            const res = await loginApi(params);
            tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
            this.userInfo = res.data.userInfo;
            return res.data;
        },

        // 拉取用户信息(菜单 + 权限)
        async fetchUserInfo() {
            const res = await getUserInfoApi();
            const data: UserInfoResult = res.data;
            this.userInfo = data.userInfo;
            this.roles = data.roles;
            this.permissions = data.permissions;
            this.menus = data.menus;
            this.isRoutesLoaded = true;
            return data;
        },

        // 退出
        async logout() {
            try {
                await logoutApi();
            } catch {
                // 忽略退出接口错误
            }
            this.resetState();
        },

        resetState() {
            this.userInfo = null;
            this.roles = [];
            this.permissions = [];
            this.menus = [];
            this.isRoutesLoaded = false;
            tokenStorage.clear();
        },

        // 按钮权限判断
        hasPermission(permiss: string): boolean {
            // admin 角色直接放行所有
            if (this.roles.includes('admin')) return true;
            return this.permissions.includes(permiss);
        },
    },
});
