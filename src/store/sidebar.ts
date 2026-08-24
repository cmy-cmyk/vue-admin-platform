import { defineStore } from 'pinia';

export const useSidebarStore = defineStore('sidebar', {
    state: () => {
        return {
            collapse: false,
            // 默认侧栏色:深石墨(slate-800),与商务藏青主题协调
            bgColor: localStorage.getItem('sidebar-bg-color') || '#1e293b',
            textColor: localStorage.getItem('sidebar-text-color') || '#cbd5e1'
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
