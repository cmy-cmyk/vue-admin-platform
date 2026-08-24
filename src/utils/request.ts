import axios, {
    AxiosInstance,
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';
import { ElMessage } from 'element-plus';
import router from '@/router';

// ========== 类型定义 ==========
export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T;
}

// ========== Token 存取工具 ==========
const ACCESS_TOKEN_KEY = 'vap_access_token';
const REFRESH_TOKEN_KEY = 'vap_refresh_token';

export const tokenStorage = {
    getAccessToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    },
    getRefreshToken(): string | null {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },
    setTokens(accessToken: string, refreshToken: string) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },
    clear() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
};

// ========== axios 实例 ==========
const service: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000,
});

// ========== 请求拦截器:自动注入 Token ==========
service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenStorage.getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// ========== 响应拦截器:统一处理业务码 / 401 续期 ==========
// 关键变量:用于实现「并发刷新队列」
// 当 access token 过期,多个请求同时返回 401 时,只发起一次 /auth/refresh,其他请求挂起等待
let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = []; // 等待新 token 的请求

function onTokenRefreshed(newToken: string) {
    pendingQueue.forEach((cb) => cb(newToken));
    pendingQueue = [];
}

async function refreshTokenRequest(): Promise<string> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('no refresh token');

    // 用 axios 原始实例调用,避免再次走拦截器死循环
    const res = await axios.post<ApiResponse<{ accessToken: string }>>(
        `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
        { refreshToken }
    );
    const newAccessToken = res.data?.data?.accessToken;
    if (!newAccessToken) throw new Error('refresh failed');
    tokenStorage.setTokens(newAccessToken, refreshToken);
    return newAccessToken;
}

function redirectToLogin() {
    tokenStorage.clear();
    ElMessage.error('登录已过期,请重新登录');
    router.replace({
        path: '/login',
        query: { redirect: router.currentRoute.value.fullPath },
    });
}

service.interceptors.response.use(
    async (response: AxiosResponse<ApiResponse>) => {
        // 业务接口返回成功
        if (response.data?.code === 0) {
            return response.data as any;
        }
        // 业务失败:统一弹错误提示
        ElMessage.error(response.data?.message || '请求失败');
        return Promise.reject(response.data);
    },
    async (error: AxiosError<ApiResponse>) => {
        const status = error.response?.status;
        const originalConfig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // 401:access token 过期,尝试 refresh 后重放原请求
        if (status === 401 && originalConfig && !originalConfig._retry) {
            originalConfig._retry = true;

            // 已经在 refresh,挂起到队列
            if (isRefreshing) {
                return new Promise((resolve) => {
                    pendingQueue.push((newToken: string) => {
                        if (originalConfig.headers) {
                            originalConfig.headers.Authorization = `Bearer ${newToken}`;
                        }
                        resolve(service(originalConfig));
                    });
                });
            }

            // 触发 refresh
            isRefreshing = true;
            try {
                const newToken = await refreshTokenRequest();
                onTokenRefreshed(newToken);
                if (originalConfig.headers) {
                    originalConfig.headers.Authorization = `Bearer ${newToken}`;
                }
                return service(originalConfig);
            } catch (e) {
                // refresh 也失败,直接踢登录
                redirectToLogin();
                return Promise.reject(e);
            } finally {
                isRefreshing = false;
            }
        }

        // 其他错误
        const message = error.response?.data?.message || error.message || '网络错误';
        if (status !== 401) {
            ElMessage.error(message);
        }
        return Promise.reject(error);
    }
);

export default service;
