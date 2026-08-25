<template>
    <div class="sidebar">
        <el-menu
            class="sidebar-el-menu"
            :default-active="onRoutes"
            :collapse="sidebar.collapse"
            :background-color="sidebar.bgColor"
            :text-color="sidebar.textColor"
            router
        >
            <template v-for="item in userStore.menus" :key="item.id">
                <template v-if="item.children && item.children.length">
                    <el-sub-menu v-permiss="item.permiss" :index="item.path || String(item.id)">
                        <template #title>
                            <el-icon v-if="item.icon">
                                <component :is="item.icon"></component>
                            </el-icon>
                            <span>{{ item.menu_name }}</span>
                        </template>
                        <template v-for="subItem in item.children" :key="subItem.id">
                            <el-sub-menu
                                v-if="subItem.children && subItem.children.length"
                                v-permiss="subItem.permiss"
                                :index="subItem.path || String(subItem.id)"
                            >
                                <template #title>{{ subItem.menu_name }}</template>
                                <el-menu-item
                                    v-for="(threeItem, i) in subItem.children"
                                    :key="i"
                                    :index="threeItem.path"
                                >
                                    {{ threeItem.menu_name }}
                                </el-menu-item>
                            </el-sub-menu>
                            <el-menu-item v-else v-permiss="subItem.permiss" :index="subItem.path">
                                {{ subItem.menu_name }}
                            </el-menu-item>
                        </template>
                    </el-sub-menu>
                </template>
                <template v-else>
                    <el-menu-item v-permiss="item.permiss" :index="item.path">
                        <el-icon v-if="item.icon">
                            <component :is="item.icon"></component>
                        </el-icon>
                        <template #title>{{ item.menu_name }}</template>
                    </el-menu-item>
                </template>
            </template>
        </el-menu>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSidebarStore } from '../store/sidebar';
import { useUserStore } from '../store/user';
import { useRoute } from 'vue-router';

const route = useRoute();
const onRoutes = computed(() => {
    return route.path;
});

const sidebar = useSidebarStore();
const userStore = useUserStore();
</script>

<style scoped>
.sidebar {
    display: block;
    position: absolute;
    left: 0;
    top: 70px;
    bottom: 0;
    overflow-y: scroll;
    border-right: 1px solid #e4e7ed;
    box-sizing: border-box;
}

.sidebar::-webkit-scrollbar {
    width: 0;
}

.sidebar-el-menu:not(.el-menu--collapse) {
    width: 250px;
}

.sidebar-el-menu {
    min-height: 100%;
}
</style>
