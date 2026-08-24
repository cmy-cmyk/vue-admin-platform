import request from '@/utils/request';
import type { ApiResponse } from '@/utils/request';
import type { TicketStatus } from './ticket';

// ========== 类型定义 ==========

// 消息类型(与后端 message.controller.ts 的 notifyTicketAction 保持一致)
export type MessageType = 'todo' | 'notify' | 'status';

// 消息列表项
export interface MessageItem {
    id: number;
    ticket_id: number | null;
    type: MessageType;
    title: string;
    content: string;
    is_read: boolean;
    created_at: string;
    // JOIN 字段(后端 LEFT JOIN ticket 返回)
    ticket_title?: string;
    ticket_status?: TicketStatus;
}

// 未读数(header 角标)
export interface UnreadCount {
    total: number;
    todo: number;
    notify: number;
    status: number;
}

// ========== 状态字典 ==========

export const MESSAGE_TYPE_OPTIONS: {
    label: string;
    value: MessageType;
    tagType: '' | 'success' | 'info' | 'warning' | 'danger';
    color: string; // 时间线/列表点颜色
}[] = [
    { label: '待办提醒', value: 'todo', tagType: 'warning', color: '#e6a23c' },
    { label: '流转通知', value: 'notify', tagType: 'success', color: '#67c23a' },
    { label: '状态变更', value: 'status', tagType: 'info', color: '#909399' }
];

export function getMessageTypeOption(type: MessageType) {
    return (
        MESSAGE_TYPE_OPTIONS.find(o => o.value === type) || { label: type, tagType: 'info' as const, color: '#909399' }
    );
}

// ========== 接口 ==========

export interface MessageListParams {
    type?: MessageType;
    is_read?: 0 | 1;
    page?: number;
    page_size?: number;
}

export interface MessageListResult {
    list: MessageItem[];
    total: number;
    page: number;
    pageSize: number;
}

// 消息列表
export function getMessageListApi(params: MessageListParams) {
    return request.get<any, ApiResponse<MessageListResult>>('/message', { params });
}

// 未读数(header 角标高频读)
export function getUnreadCountApi() {
    return request.get<any, ApiResponse<UnreadCount>>('/message/unread-count');
}

// 单条标记已读
export function markAsReadApi(id: number) {
    return request.post<any, ApiResponse<{ id: number }>>(`/message/${id}/read`);
}

// 全部标记已读(可选 type 过滤)
export function markAllAsReadApi(type?: MessageType) {
    return request.post<any, ApiResponse<null>>('/message/read-all', undefined, {
        params: type ? { type } : undefined
    });
}
