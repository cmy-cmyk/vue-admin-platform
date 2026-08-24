import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '../store/user';
import Home from '../views/home.vue';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// ========== 静态路由 ==========
// 1. 公开路由(noAuth):无需登录即可访问
// 2. Home 布局路由:作为动态业务路由的父级容器,空 children 占位
const staticRoutes: RouteRecordRaw[] = [
    {
        path: '/login',
        meta: { title: '登录', noAuth: true },
        component: () => import('../views/pages/login.vue'),
    },
    {
        path: '/register',
        meta: { title: '注册', noAuth: true },
        component: () => import('../views/pages/register.vue'),
    },
    {
        path: '/reset-pwd',
        meta: { title: '重置密码', noAuth: true },
        component: () => import('../views/pages/reset-pwd.vue'),
    },
    {
        path: '/403',
        meta: { title: '没有权限', noAuth: true },
        component: () => import('../views/pages/403.vue'),
    },
    {
        path: '/404',
        meta: { title: '找不到页面', noAuth: true },
        component: () => import('../views/pages/404.vue'),
    },
    {
        // Home 是布局容器,业务子路由全部动态注册到它的 children
        path: '/',
        name: 'Home',
        component: Home,
        children: [],
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes: staticRoutes,
});

// ========== 动态路由注册工具 ==========
// 用 import.meta.glob 把 src/views 下的 .vue 文件预先收集,后端菜单返回 component 字段时映射到具体组件
const modules = import.meta.glob('../views/**/*.vue');

function getComponent(componentPath: string) {
    // 后端返回 'dashboard' 或 'system/user',这里拼出 ../views/dashboard.vue 或 ../views/system/user.vue
    const full = `../views/${componentPath}.vue`;
    return modules[full] || (() => import('../views/pages/404.vue'));
}

// 递归把后端返回的菜单树转成路由树,挂到 Home 下
function buildDynamicRoutes(menus: any[]): RouteRecordRaw[] {
    return menus
        .filter((m) => m.menu_type !== 2) // 按钮不算路由
        .map((m) => {
            const route: RouteRecordRaw = {
                path: m.path,
                name: m.path,
                meta: {
                    title: m.menu_name,
                    permiss: m.permiss || '',
                    icon: m.icon || '',
                },
                component: m.component ? getComponent(m.component) : undefined,
            };
            if (m.children && m.children.length > 0) {
                route.children = buildDynamicRoutes(m.children);
            }
            return route;
        });
}

function addDynamicRoutes(menus: any[]) {
    const routes = buildDynamicRoutes(menus);
    routes.forEach((r) => {
        // 全部挂到 Home 下作为 children
        router.addRoute('Home', r);
    });
}

function resetRouter() {
    // 退出登录时调用,清掉动态路由(暂用粗暴实现:重新创建 router)
    // 完整版应记录已注册的动态路由名,逐一 removeRoute
    location.reload();
}

// ========== 路由守卫 ==========
router.beforeEach(async (to, from, next) => {
    NProgress.start();
    document.title = (to.meta.title as string) ? `${to.meta.title} - Vue Admin Platform` : 'Vue Admin Platform';

    const userStore = useUserStore();
    const hasToken = !!localStorage.getItem('vap_access_token');

    // 1. 未登录
    if (!hasToken) {
        if (to.meta.noAuth) {
            next();
        } else {
            next({ path: '/login', query: { redirect: to.fullPath } });
        }
        return;
    }

    // 2. 已登录但访问登录页,直接回首页
    if (to.path === '/login') {
        next({ path: '/' });
        return;
    }

    // 3. 已登录,但路由还没动态加载(刷新页面场景)
    if (!userStore.isRoutesLoaded) {
        try {
            await userStore.fetchUserInfo();
            addDynamicRoutes(userStore.menus);
            // 关键:next({ ...to, replace: true }) 让重定向后再次匹配刚注册的路由
            // 否则刷新会停在 /404
            next({ ...to, replace: true });
            return;
        } catch (e) {
            // 拉用户信息失败:token 失效或后端异常,踢登录
            userStore.resetState();
            next({ path: '/login', query: { redirect: to.fullPath } });
            return;
        }
    }

    // 4. 已登录且路由已加载,正常放行
    // 按钮权限校验由 v-permiss 指令负责,这里不阻断路由
    next();
});

router.afterEach(() => {
    NProgress.done();
});

export { resetRouter };
export default router;
