import request from '@/utils/request';
import type { ApiResponse } from '@/utils/request';

// ========== 类型定义 ==========

// 工单状态(与后端 ticket-fsm.ts 保持一致)
export type TicketStatus = 'draft' | 'pending' | 'approving' | 'approved' | 'rejected' | 'closed';

// 工单操作动作
export type TicketAction = 'submit' | 'approve' | 'reject' | 'withdraw' | 'close';

// 优先级
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

// 工单列表项
export interface TicketItem {
    id: number;
    title: string;
    content: string;
    priority: TicketPriority;
    status: TicketStatus;
    category: string;
    creator_id: number;
    current_approver_id: number | null;
    created_at: string;
    updated_at: string;
    // 关联字段(后端 JOIN 返回)
    creator_name?: string;
    current_approver_name?: string;
}

// 流转日志
export interface TicketLogItem {
    id: number;
    ticket_id: number;
    operator_id: number;
    action: TicketAction;
    from_status: TicketStatus | null;
    to_status: TicketStatus;
    remark: string;
    created_at: string;
    operator_name?: string;
}

// 工单详情(主表 + 完整流转日志)
export interface TicketDetail extends TicketItem {
    logs: TicketLogItem[];
}

// 统计卡片
export interface TicketStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    myCreated: number;
    myPendingApprove: number;
    isAdmin: boolean;
}

// ========== 状态字典(前端展示用,集中管理避免散落) ==========

export const TICKET_STATUS_OPTIONS: {
    label: string;
    value: TicketStatus;
    tagType: '' | 'success' | 'info' | 'warning' | 'danger';
}[] = [
    { label: '草稿', value: 'draft', tagType: 'info' },
    { label: '待审批', value: 'pending', tagType: 'warning' },
    { label: '审批中', value: 'approving', tagType: 'warning' },
    { label: '已通过', value: 'approved', tagType: 'success' },
    { label: '已驳回', value: 'rejected', tagType: 'danger' },
    { label: '已关闭', value: 'closed', tagType: 'info' }
];

export const TICKET_PRIORITY_OPTIONS: {
    label: string;
    value: TicketPriority;
    tagType: '' | 'success' | 'info' | 'warning' | 'danger';
}[] = [
    { label: '低', value: 'low', tagType: 'info' },
    { label: '中', value: 'normal', tagType: '' },
    { label: '高', value: 'high', tagType: 'warning' },
    { label: '紧急', value: 'urgent', tagType: 'danger' }
];

export const TICKET_ACTION_LABEL: Record<TicketAction, string> = {
    submit: '提交',
    approve: '审批通过',
    reject: '驳回',
    withdraw: '撤回',
    close: '关闭'
};

// 工具函数:根据状态值取展示配置
export function getStatusOption(status: TicketStatus) {
    return TICKET_STATUS_OPTIONS.find(o => o.value === status) || { label: status, tagType: 'info' as const };
}

export function getPriorityOption(priority: TicketPriority) {
    return TICKET_PRIORITY_OPTIONS.find(o => o.value === priority) || { label: priority, tagType: 'info' as const };
}

// ========== 接口 ==========

export interface TicketListParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    scope?: 'mine' | 'approve' | 'all';
}

export interface TicketListResult {
    list: TicketItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CreateTicketParams {
    title: string;
    content?: string;
    priority?: TicketPriority;
    category?: string;
    approverId?: number;
    submit?: boolean;
}

export interface TicketActionParams {
    action: TicketAction;
    remark?: string;
}

// 列表
export function getTicketListApi(params: TicketListParams) {
    return request.get<any, ApiResponse<TicketListResult>>('/ticket', { params });
}

// 详情(含完整流转日志)
export function getTicketDetailApi(id: number) {
    return request.get<any, ApiResponse<TicketDetail>>(`/ticket/${id}`);
}

// 创建(草稿 or 直接提交)
export function createTicketApi(data: CreateTicketParams) {
    return request.post<any, ApiResponse<{ id: number }>>('/ticket', data);
}

// 流转操作(状态机驱动)
export function ticketActionApi(id: number, data: TicketActionParams) {
    return request.post<any, ApiResponse<{ id: number; status: TicketStatus }>>(`/ticket/${id}/action`, data);
}

// 首页统计卡片
export function getTicketStatsApi() {
    return request.get<any, ApiResponse<TicketStats>>('/ticket/stats');
}
