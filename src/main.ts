import { createApp } from 'vue';
import { createPinia } from 'pinia';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';
import { useUserStore } from './store/user';
import 'element-plus/dist/index.css';
import './assets/css/icon.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// 注册elementplus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

// 自定义权限指令 v-permiss="'user:add'"
// 通过 useUserStore.hasPermission 判断当前用户是否拥有该权限串
// 注意:store 必须在 app.use(createPinia()) 之后才能调用
const userStore = useUserStore();
app.directive('permiss', {
    mounted(el, binding) {
        const val = binding.value;
        if (val && !userStore.hasPermission(String(val))) {
            // 隐藏该元素(简单实现:设置 hidden 属性)
            // 更完善的做法:el.parentNode?.removeChild(el) 真正移除
            el.style.display = 'none';
        }
    },
    updated(el, binding) {
        // 状态切换后重新评估(如用户信息刷新)
        const val = binding.value;
        if (val && !userStore.hasPermission(String(val))) {
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    },
});

app.mount('#app');
