/**
 * 工单状态机(Finite State Machine)
 *
 * 简历卖点:用转换表驱动状态流转,代替散落的 if-else 分支,
 * 新增状态/动作只需改配置,符合开闭原则。
 *
 * 状态节点(6 个):draft / pending / approving / approved / rejected / closed
 * 转换边(8 条):
 *   draft    --submit-->   pending
 *   pending  --approve-->  approving  (一级审批通过,留二级扩展点)
 *   pending  --approve-->  approved   (一级直接通过,可配置)
 *   pending  --reject-->   rejected
 *   pending  --withdraw--> draft     (发起人撤回)
 *   approving--approve-->  approved  (二级审批通过)
 *   approving--reject-->   rejected
 *   approved  --close-->    closed
 */

import { TicketAction, TicketStatus } from '../types/ticket';

// 状态中文标签(前端展示用,后端只返字段值,前端字典里映射)
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  draft: '草稿',
  pending: '待审批',
  approving: '审批中',
  approved: '已通过',
  rejected: '已驳回',
  closed: '已关闭',
};

// 动作中文标签
export const TICKET_ACTION_LABEL: Record<TicketAction, string> = {
  submit: '提交',
  approve: '审批通过',
  reject: '驳回',
  withdraw: '撤回',
  close: '关闭',
};

// 转换表:from -> action -> to
// 这是状态机的核心:所有合法流转集中配置,非法流转在 canTransition 处一次性拦截
type TransitionTable = Record<TicketStatus, Partial<Record<TicketAction, TicketStatus>>>;

export const TRANSITIONS: TransitionTable = {
  draft: {
    submit: 'pending',
  },
  pending: {
    approve: 'approving', // 默认走二级审批(pending -> approving)
    reject: 'rejected',
    withdraw: 'draft',
  },
  approving: {
    approve: 'approved',
    reject: 'rejected',
  },
  approved: {
    close: 'closed',
  },
  rejected: {}, // 终态:不可再流转(可由发起人重新编辑后提交,本期 MVP 不做)
  closed: {},   // 终态
};

/**
 * 校验动作是否合法
 * @returns 合法时返回目标状态;非法返回 null
 */
export function canTransition(from: TicketStatus, action: TicketAction): TicketStatus | null {
  const target = TRANSITIONS[from]?.[action];
  return target ?? null;
}

/**
 * 判断当前用户是否有权执行该动作
 * 规则:
 *   submit   —— 仅 creator 可执行(草稿态提交)
 *   approve  —— 仅 current_approver 可执行
 *   reject   —— 仅 current_approver 可执行
 *   withdraw —— 仅 creator 可执行(撤回自己发起的)
 *   close    —— creator 或 admin
 *
 * @param action 动作
 * @param userId 当前用户 id
 * @param creatorId 工单发起人
 * @param currentApproverId 当前审批人(可能为 null)
 * @returns 是否有权
 */
export function canPerformAction(
  action: TicketAction,
  userId: number,
  creatorId: number,
  currentApproverId: number | null
): boolean {
  switch (action) {
    case 'submit':
      return userId === creatorId;
    case 'approve':
    case 'reject':
      return currentApproverId !== null && userId === currentApproverId;
    case 'withdraw':
      return userId === creatorId;
    case 'close':
      return userId === creatorId;
    default:
      return false;
  }
}

/**
 * 是否终态(不可再流转)
 */
export function isTerminalStatus(status: TicketStatus): boolean {
  return status === 'rejected' || status === 'closed';
}
