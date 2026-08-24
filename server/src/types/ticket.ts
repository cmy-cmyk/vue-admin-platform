// 工单审批系统类型定义

// 工单状态枚举(7 个状态节点)
export type TicketStatus = 'draft' | 'pending' | 'approving' | 'approved' | 'rejected' | 'closed';

// 工单操作动作(6 条转换边)
export type TicketAction = 'submit' | 'approve' | 'reject' | 'withdraw' | 'close';

// 优先级
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

// 工单主表实体
export interface Ticket {
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
}

// 工单列表查询时附加的关联字段
export interface TicketWithRelations extends Ticket {
  creator_name?: string;
  current_approver_name?: string;
}

// 工单流转日志
export interface TicketLog {
  id: number;
  ticket_id: number;
  operator_id: number;
  action: TicketAction;
  from_status: TicketStatus | null;
  to_status: TicketStatus;
  remark: string;
  created_at: string;
}

// 日志关联操作人昵称(时间线展示用)
export interface TicketLogWithOperator extends TicketLog {
  operator_name?: string;
}

// 工单详情(主表 + 完整流转日志)
export interface TicketDetail extends TicketWithRelations {
  logs: TicketLogWithOperator[];
}

// 创建工单请求体
export interface CreateTicketBody {
  title: string;
  content?: string;
  priority?: TicketPriority;
  category?: string;
  // 提交即流转:submit=true 时直接从 draft 走到 pending,否则停留在 draft
  submit?: boolean;
}

// 工单列表查询参数
export interface TicketListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  scope?: 'mine' | 'approve' | 'all'; // 数据权限视角
}

// 流转操作请求体
export interface TicketActionBody {
  action: TicketAction;
  remark?: string;
}

// 首页统计卡片
export interface TicketStats {
  total: number;
  pending: number;          // 待审批(pending + approving)
  approved: number;
  rejected: number;
  myCreated: number;        // 我发起的
  myPendingApprove: number; // 待我审批
}
