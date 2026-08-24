import { defineStore } from 'pinia';
import { getUnreadCountApi, type UnreadCount } from '@/api/message';

interface MessageState {
    unread: UnreadCount;
}

export const useMessageStore = defineStore('message', {
    state: (): MessageState => ({
        unread: { total: 0, todo: 0, notify: 0, status: 0 }
    }),

    getters: {
        hasUnread: state => state.unread.total > 0
    },

    actions: {
        // 拉取未读数(header 登录后 + 工单操作后调用)
        async fetchUnread() {
            try {
                const res = await getUnreadCountApi();
                this.unread = res.data;
            } catch {
                // 静默失败,不打断主流程
            }
        },

        // 减少未读数(标记已读后本地同步,避免再发请求)
        decrement(type: 'todo' | 'notify' | 'status') {
            if (this.unread[type] > 0) {
                this.unread[type]--;
                this.unread.total--;
            }
        },

        // 清零(全部已读)
        clear() {
            this.unread = { total: 0, todo: 0, notify: 0, status: 0 };
        }
    }
});
