import { defineStore } from 'pinia';

export const useSidebarStore = defineStore('sidebar', {
    state: () => {
        return {
            collapse: false,
            // 默认侧栏色:与主题青绿协调的深石板色,比原 #324157 更柔和
            bgColor: localStorage.getItem('sidebar-bg-color') || '#1f2937',
            textColor: localStorage.getItem('sidebar-text-color') || '#d1d5db'
        };
    },
    getters: {},
    actions: {
        handleCollapse() {
            this.collapse = !this.collapse;
        },
        setBgColor(color: string) {
            this.bgColor = color;
            localStorage.setItem('sidebar-bg-color', color);
        },
        setTextColor(color: string) {
            this.textColor = color;
            localStorage.setItem('sidebar-text-color', color);
        }
    }
});
