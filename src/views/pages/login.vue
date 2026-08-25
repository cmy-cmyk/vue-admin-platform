<template>
    <div class="login-page">
        <div class="login-card">
            <div class="login-header">
                <img class="logo" src="../../assets/img/logo.svg" alt="工单审批系统" />
                <span class="login-title">工单审批系统</span>
            </div>
            <el-form ref="login" :model="param" :rules="rules" size="large" class="login-form">
                <el-form-item prop="username">
                    <el-input v-model="param.username" placeholder="用户名">
                        <template #prefix>
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
                        <template #prefix>
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
                <el-button class="login-btn" type="primary" size="large" :loading="loading" @click="submitForm(login)">
                    登录
                </el-button>
                <p class="login-tips">演示账号 admin / 123456</p>
                <p class="login-text">
                    没有账号？
                    <el-link type="primary" @click="$router.push('/register')">立即注册</el-link>
                </p>
            </el-form>
        </div>
        <p class="login-footer">© 2026 工单审批系统</p>
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
/* === 单卡片居中:现代简约企业风 === */
.login-page {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: #1e3a8a;
    background-image: url('../../assets/img/login-bg.svg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

.login-card {
    width: 400px;
    max-width: calc(100% - 40px);
    padding: 44px 40px 32px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 10px;
    box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
    box-sizing: border-box;
}

.login-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 36px;
}

.logo {
    width: 32px;
    height: 32px;
}

.login-title {
    font-size: 20px;
    font-weight: 600;
    color: #18181b;
    letter-spacing: 0.5px;
}

.pwd-tips {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    margin: -8px 0 16px;
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
    text-align: center;
}

.login-text {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 12px;
    font-size: 14px;
    color: #71717a;
}

.login-footer {
    position: absolute;
    bottom: 24px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 12px;
    color: #a1a1aa;
}

/* === 响应式:小屏卡片撑满 === */
@media (max-width: 480px) {
    .login-card {
        border-radius: 0;
        border-left: none;
        border-right: none;
        min-height: 100vh;
        box-shadow: none;
    }
}
</style>
