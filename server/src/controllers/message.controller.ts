import { Request, Response } from 'express';
import { query, queryOne, execute } from '../config/db';
import { success, fail } from '../utils/response';
import type { TicketStatus, TicketAction } from '../types/ticket';

// ============================================================
// 消息中心 controller
// ============================================================

// 当前登录用户 id + 昵称(消息正文里要展示"谁操作了什么")
async function currentUserInfo(req: Request): Promise<{ userId: number; nickname: string }> {
  const userId = req.user?.userId ?? 0;
  const u = await queryOne<{ nickname: string }>(
    'SELECT nickname FROM user WHERE id = ?',
    [userId]
  );
  return { userId, nickname: u?.nickname || '系统' };
}

// ============================================================
// 1. GET /api/message  消息列表
//    query: type?(todo/notify/status) is_read?(0/1) page page_size
// ============================================================
export async function getMessageList(req: Request, res: Response) {
  const { userId } = await currentUserInfo(req);
  const type = (req.query.type as string) || '';
  const isRead = req.query.is_read as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.page_size as string) || 10));

  // 动态拼 WHERE(参数化查询防注入)
  const where: string[] = ['m.user_id = ?'];
  const params: any[] = [userId];
  if (type) {
    where.push('m.type = ?');
    params.push(type);
  }
  if (isRead === '0' || isRead === '1') {
    where.push('m.is_read = ?');
    params.push(Number(isRead));
  }
  const whereSql = where.join(' AND ');

  const total = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM message m WHERE ${whereSql}`,
    params
  );
  const list = await query<any>(
    `SELECT m.id, m.ticket_id, m.type, m.title, m.content, m.is_read, m.created_at,
            t.title AS ticket_title, t.status AS ticket_status
     FROM message m
     LEFT JOIN ticket t ON t.id = m.ticket_id
     WHERE ${whereSql}
     ORDER BY m.is_read ASC, m.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return success(res, {
    list: list.map((r: any) => ({
      ...r,
      is_read: Boolean(r.is_read), // 转成 boolean 方便前端
    })),
    total: total?.n || 0,
    page,
    pageSize,
  });
}

// ============================================================
// 2. GET /api/message/unread-count  未读数(header 角标高频读)
//    返回: { total, todo, notify, status }
// ============================================================
export async function getUnreadCount(req: Request, res: Response) {
  const { userId } = await currentUserInfo(req);
  const rows = await query<{ type: string; n: number }>(
    `SELECT type, COUNT(*) AS n FROM message
     WHERE user_id = ? AND is_read = 0
     GROUP BY type`,
    [userId]
  );

  const result = { total: 0, todo: 0, notify: 0, status: 0 };
  rows.forEach((r) => {
    (result as any)[r.type] = r.n;
    result.total += r.n;
  });
  return success(res, result);
}

// ============================================================
// 3. POST /api/message/:id/read  标记单条已读
// ============================================================
export async function markAsRead(req: Request, res: Response) {
  const { userId } = await currentUserInfo(req);
  const id = parseInt(req.params.id);
  // WHERE user_id 保证只能改自己的消息,防越权
  const result = await execute(
    `UPDATE message SET is_read = 1 WHERE id = ? AND user_id = ? AND is_read = 0`,
    [id, userId]
  );
  // execute 在 db.ts 里返回的是变化信息(这里只关心有没有改到)
  if (!result || (result as any).changes === 0) {
    // 可能是消息不存在/不属于自己/本来就是已读,都返回成功(幂等)
  }
  return success(res, { id }, '已读');
}

// ============================================================
// 4. POST /api/message/read-all  全部标记已读(可选 type 过滤)
// ============================================================
export async function markAllAsRead(req: Request, res: Response) {
  const { userId } = await currentUserInfo(req);
  const type = (req.query.type as string) || '';
  if (type) {
    await execute(
      `UPDATE message SET is_read = 1 WHERE user_id = ? AND is_read = 0 AND type = ?`,
      [userId, type]
    );
  } else {
    await execute(
      `UPDATE message SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
  }
  return success(res, null, '已全部标记为已读');
}

// ============================================================
// 5. 供工单流转调用的消息触发函数(不是路由 handler)
//    在 doTicketAction 成功后调用,根据 action + toStatus 派发消息给相关人员
//    设计原则:
//    - todo 消息(待办):进入 pending/approving 时给审批人发
//    - notify 消息(流转通知):approve/reject 时给发起人发(不给自己发)
//    - status 消息(状态变更):submit/withdraw/close 时给相关人发
// ============================================================
export async function notifyTicketAction(params: {
  ticketId: number;
  ticketTitle: string;
  creatorId: number;
  approverId: number | null;
  operatorId: number;
  operatorName: string;
  action: TicketAction;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  remark: string;
}) {
  const {
    ticketId, ticketTitle, creatorId, approverId,
    operatorId, operatorName, action, toStatus, remark,
  } = params;

  // 复用插入函数
  const insert = (userId: number, type: 'todo' | 'notify' | 'status', title: string, content: string) => {
    // 跳过"给自己发消息"的情况(自己操作自己工单时不打扰)
    if (userId === operatorId) return;
    if (!userId) return;
    return execute(
      `INSERT INTO message (user_id, ticket_id, type, title, content) VALUES (?, ?, ?, ?, ?)`,
      [userId, ticketId, type, title, content]
    );
  };

  const ticketRef = `「${ticketTitle}」`;

  switch (action) {
    case 'submit':
      // 给审批人发待办
      if (approverId) {
        await insert(approverId, 'todo', '有工单待你审批',
          `${ticketRef} 由 ${operatorName} 提交,请及时处理`);
      }
      break;

    case 'approve':
      // 给发起人发流转通知(告知进度)
      await insert(creatorId, 'notify',
        toStatus === 'approved' ? '你的工单已全部通过' : '你的工单审批进度更新',
        `${ticketRef} ${operatorName} 审批通过${remark ? ' - ' + remark : ''}`);
      // 多级审批:从 pending -> approving,审批人不变,仍需继续审,给自己发个 status 提醒
      // (operatorId === approverId 时 insert 自动跳过,不打扰)
      break;

    case 'reject':
      // 给发起人发通知:被驳回
      await insert(creatorId, 'notify', '你的工单被驳回',
        `${ticketRef} ${operatorName} 驳回了申请${remark ? ' - ' + remark : ''}`);
      break;

    case 'withdraw':
      // 给审批人发状态变更:发起人撤回了,不用再看了
      if (approverId) {
        await insert(approverId, 'status', '工单被发起人撤回',
          `${ticketRef} ${operatorName} 撤回了申请`);
      }
      break;

    case 'close':
      // 给发起人发状态变更:工单已关闭
      await insert(creatorId, 'status', '你的工单已关闭',
        `${ticketRef} 已关闭`);
      break;
  }
}
