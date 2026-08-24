<template>
    <div class="login-page">
        <!-- 左侧:品牌展示区(青绿渐变) -->
        <div class="login-brand">
            <div class="brand-content">
                <div class="brand-logo">
                    <img src="../../assets/img/logo.svg" alt="FlowExpress" />
                    <span class="brand-name">FlowExpress</span>
                </div>
                <h1 class="brand-slogan">
                    工单流驱动的
                    <br />
                    中后台基座
                </h1>
                <p class="brand-desc">
                    状态机驱动审批闭环 · RBAC 三级权限管控
                    <br />
                    JWT 双 Token 鉴权 · 全栈 TypeScript
                </p>
                <div class="brand-features">
                    <div class="feature-item">
                        <i class="el-icon-lx-appreciate"></i>
                        <span>工单全生命周期管理</span>
                    </div>
                    <div class="feature-item">
                        <i class="el-icon-lx-appreciate"></i>
                        <span>多级审批 + 驳回回退</span>
                    </div>
                    <div class="feature-item">
                        <i class="el-icon-lx-appreciate"></i>
                        <span>操作日志审计追溯</span>
                    </div>
                    <div class="feature-item">
                        <i class="el-icon-lx-appreciate"></i>
                        <span>消息中心实时触达</span>
                    </div>
                </div>
            </div>
            <!-- 装饰光斑(纯 CSS,无图片资源) -->
            <div class="brand-glow brand-glow-1"></div>
            <div class="brand-glow brand-glow-2"></div>
        </div>

        <!-- 右侧:登录表单区 -->
        <div class="login-form-wrap">
            <div class="login-container">
                <div class="login-header">
                    <img class="logo mr10" src="../../assets/img/logo.svg" alt="" />
                    <div class="login-title">欢迎回来</div>
                </div>
                <el-form ref="login" :model="param" :rules="rules" size="large">
                    <el-form-item prop="username">
                        <el-input v-model="param.username" placeholder="用户名">
                            <template #prepend>
                                <el-icon>
                                    <User />
                                </el-icon>
                            </template>
                        </el-input>
                    </el-form-item>
                    <el-form-item prop="password">
                        <el-input
                            v-model="param.password"
                            type="password"
                            placeholder="密码"
                            @keyup.enter="submitForm(login)"
                        >
                            <template #prepend>
                                <el-icon>
                                    <Lock />
                                </el-icon>
                            </template>
                        </el-input>
                    </el-form-item>
                    <div class="pwd-tips">
                        <el-checkbox v-model="checked" class="pwd-checkbox" label="记住密码" />
                        <el-link type="primary" @click="$router.push('/reset-pwd')">忘记密码</el-link>
                    </div>
                    <el-button
                        class="login-btn"
                        type="primary"
                        size="large"
                        :loading="loading"
                        @click="submitForm(login)"
                    >
                        登录
                    </el-button>
                    <p class="login-tips">Tips : 演示账号 admin / 123456 或 user / 123456</p>
                    <p class="login-text">
                        没有账号？
                        <el-link type="primary" @click="$router.push('/register')">立即注册</el-link>
                    </p>
                </el-form>
            </div>
            <p class="login-footer">© 2026 FlowExpress · 流波</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useTabsStore } from '@/store/tabs';
import { useUserStore } from '@/store/user';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';

interface LoginInfo {
    username: string;
    password: string;
}

const lgStr = localStorage.getItem('login-param');
const defParam = lgStr ? JSON.parse(lgStr) : null;
const checked = ref(lgStr ? true : false);

const router = useRouter();
const route = useRoute();
const param = reactive<LoginInfo>({
    username: defParam ? defParam.username : 'admin',
    password: defParam ? defParam.password : '123456'
});

const rules: FormRules = {
    username: [
        {
            required: true,
            message: '请输入用户名',
            trigger: 'blur'
        }
    ],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};
const userStore = useUserStore();
const login = ref<FormInstance>();
const loading = ref(false);

const submitForm = (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    formEl.validate(async (valid: boolean) => {
        if (!valid) {
            ElMessage.error('请检查输入');
            return;
        }
        loading.value = true;
        try {
            await userStore.login(param);
            ElMessage.success('登录成功');
            if (checked.value) {
                localStorage.setItem('login-param', JSON.stringify(param));
            } else {
                localStorage.removeItem('login-param');
            }
            // 路由守卫会自动拉用户信息 + 动态注册路由
            const redirect = (route.query.redirect as string) || '/';
            router.push(redirect);
        } catch (e: any) {
            // axios 拦截器已弹错误提示,这里不重复弹
            console.error(e);
        } finally {
            loading.value = false;
        }
    });
};

const tabs = useTabsStore();
tabs.clearTabs();
</script>

<style scoped>
/* === 双屏布局:左品牌右表单 === */
.login-page {
    display: flex;
    width: 100%;
    height: 100vh;
    background: #fff;
}

/* === 左侧品牌区:青绿渐变 === */
.login-brand {
    position: relative;
    flex: 1;
    overflow: hidden;
    /* 主题色对角渐变:深青 → 青绿 → 翠绿 */
    background: linear-gradient(135deg, #0f766e 0%, #0d9488 45%, #14b8a6 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
}

.brand-content {
    position: relative;
    z-index: 2;
    padding: 60px;
    max-width: 520px;
}

.brand-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 80px;
}

.brand-logo img {
    width: 36px;
    height: 36px;
    /* logo 反色,在深色背景上更清晰 */
    filter: brightness(0) invert(1);
}

.brand-name {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.brand-slogan {
    font-size: 40px;
    font-weight: 700;
    line-height: 1.25;
    margin-bottom: 24px;
    letter-spacing: -0.5px;
}

.brand-desc {
    font-size: 15px;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.85);
    margin-bottom: 48px;
}

.brand-features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
}

.feature-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
}

.feature-item i {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
}

/* 装饰光斑:纯 CSS 径向渐变,营造空间感 */
.brand-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.4;
    pointer-events: none;
}

.brand-glow-1 {
    width: 400px;
    height: 400px;
    top: -100px;
    right: -100px;
    background: radial-gradient(circle, #5eead4 0%, transparent 70%);
}

.brand-glow-2 {
    width: 300px;
    height: 300px;
    bottom: -50px;
    left: -50px;
    background: radial-gradient(circle, #2dd4bf 0%, transparent 70%);
}

/* === 右侧登录表单区 === */
.login-form-wrap {
    width: 520px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background: #fff;
}

.login-container {
    width: 100%;
    max-width: 380px;
}

.login-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 40px;
}

.logo {
    width: 32px;
}

.login-title {
    font-size: 22px;
    color: #18181b;
    font-weight: 600;
}

.pwd-tips {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    margin: -10px 0 10px;
    color: #71717a;
}

.pwd-checkbox {
    height: auto;
}

.login-btn {
    display: block;
    width: 100%;
    height: 44px;
    font-size: 15px;
    font-weight: 500;
}

.login-tips {
    font-size: 12px;
    color: #a1a1aa;
    margin-top: 16px;
}

.login-text {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 20px;
    font-size: 14px;
    color: #71717a;
}

.login-footer {
    position: absolute;
    bottom: 24px;
    font-size: 12px;
    color: #a1a1aa;
}

/* === 响应式:窄屏隐藏左侧品牌区 === */
@media (max-width: 900px) {
    .login-brand {
        display: none;
    }
    .login-form-wrap {
        width: 100%;
    }
}
</style>
