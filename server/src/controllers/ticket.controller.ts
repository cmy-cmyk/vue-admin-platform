import { Request, Response } from 'express';
import { query, queryOne } from '../config/db';
import { success, fail } from '../utils/response';
import {
  canTransition,
  canPerformAction,
  isTerminalStatus,
} from '../services/ticket-fsm';
import type {
  Ticket,
  TicketLogWithOperator,
  TicketDetail,
  CreateTicketBody,
  TicketListQuery,
  TicketActionBody,
  TicketStats,
  TicketStatus,
  TicketPriority,
} from '../types/ticket';

// 当前登录用户的 id 与角色(从 JWT 取 userId,再查数据库拿 role_keys)
// 注:JwtPayload 只塞了 userId/username,角色需查 DB;此处每个工单接口查一次,
// 优化点:可加 requirePermission 中间件把 roles 一次性挂到 req.user
async function currentUser(req: Request): Promise<{ userId: number; isAdmin: boolean }> {
  const userId = req.user?.userId ?? 0;
  const rows = await query<{ role_key: string }>(
    `SELECT r.role_key FROM role r
     JOIN user_role ur ON ur.role_id = r.id
     WHERE ur.user_id = ? AND r.status = 1`,
    [userId]
  );
  const isAdmin = rows.some((r) => r.role_key === 'admin');
  return { userId, isAdmin };
}

// 合法优先级白名单(防注入 + 防脏数据)
const VALID_PRIORITIES: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];
// 合法状态白名单
const VALID_STATUSES: TicketStatus[] = [
  'draft', 'pending', 'approving', 'approved', 'rejected', 'closed',
];

// ============================================================
// 1. POST /api/ticket  创建工单(草稿 or 直接提交)
//    body: { title, content?, priority?, category?, approverId?, submit? }
// ============================================================
export async function createTicket(req: Request, res: Response) {
  const { userId, isAdmin } = await currentUser(req);
  void isAdmin; // 创建工单不需要 admin 判断,预留
  const {
    title,
    content = '',
    priority = 'normal',
    category = 'default',
    approverId,
    submit = false,
  } = (req.body || {}) as CreateTicketBody & { approverId?: number };

  if (!title || !title.trim()) {
    return fail(res, '工单标题不能为空');
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return fail(res, `非法优先级:${priority}`);
  }

  // 初始状态:submit=true 直接到 pending,否则停留在 draft
  const initialStatus: TicketStatus = submit ? 'pending' : 'draft';
  // 审批人在创建时就指定(草稿态也保存,但 scope=approve 列表会按状态过滤掉草稿)
  const currentApproverId = Number(approverId || 1);

  const result: any = await queryOne<any>(
    `INSERT INTO ticket (title, content, priority, status, category, creator_id, current_approver_id)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [title.trim(), content, priority, initialStatus, category, userId, currentApproverId]
  );
  const newId = result?.id;
  if (!newId) {
    return fail(res, '创建失败');
  }

  // 若直接提交,落一条 submit 日志(状态变更审计)
  if (submit) {
    await query(
      `INSERT INTO ticket_log (ticket_id, operator_id, action, from_status, to_status, remark)
       VALUES (?, ?, 'submit', NULL, 'pending', ?)`,
      [newId, userId, '提交申请']
    );
  }

  return success(res, { id: newId }, submit ? '工单已提交' : '草稿已保存');
}

// ============================================================
// 2. GET /api/ticket  工单列表(分页 + 筛选 + 数据权限)
//    query: page, pageSize, keyword, status, priority, scope(mine|approve|all)
// ============================================================
export async function getTicketList(req: Request, res: Response) {
  const { userId, isAdmin } = await currentUser(req);
  const q = req.query as unknown as TicketListQuery;

  const page = Math.max(1, parseInt(String(q.page ?? '1')) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(q.pageSize ?? '10')) || 10));
  const offset = (page - 1) * pageSize;
  const keyword = (q.keyword ?? '').trim();
  const status = q.status;
  const priority = q.priority;
  const scope = q.scope ?? 'all';

  // === 数据权限:双层校验 ===
  // 1. 接口层:任何登录用户都可访问列表接口(RBAC 在路由层 ticket:view 拦截)
  // 2. 数据层:按 scope 过滤
  //    - mine:     我发起的
  //    - approve:  待我审批的
  //    - all:      管理员看全部;非管理员只看「我发起的 + 待我审批的」并集
  const where: string[] = [];
  const params: any[] = [];

  if (scope === 'mine') {
    where.push('t.creator_id = ?');
    params.push(userId);
  } else if (scope === 'approve') {
    // 待我审批:仅含已提交状态(pending/approving),草稿不应出现在审批人待办里
    where.push('(t.current_approver_id = ? AND t.status IN (?, ?))');
    params.push(userId, 'pending', 'approving');
  } else {
    // scope === 'all'
    if (!isAdmin) {
      where.push('(t.creator_id = ? OR t.current_approver_id = ?)');
      params.push(userId, userId);
    }
  }

  if (keyword) {
    where.push('(t.title LIKE ? OR t.content LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like);
  }
  if (status && VALID_STATUSES.includes(status)) {
    where.push('t.status = ?');
    params.push(status);
  }
  if (priority && VALID_PRIORITIES.includes(priority)) {
    where.push('t.priority = ?');
    params.push(priority);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const listSql = `
    SELECT t.*, u.nickname AS creator_name, u2.nickname AS current_approver_name
    FROM ticket t
    LEFT JOIN user u  ON u.id  = t.creator_id
    LEFT JOIN user u2 ON u2.id = t.current_approver_id
    ${whereClause}
    ORDER BY t.id DESC
    LIMIT ? OFFSET ?
  `;
  const list = await query<any>(listSql, [...params, pageSize, offset]);

  const totalSql = `SELECT COUNT(*) AS total FROM ticket t ${whereClause}`;
  const totalRow = await queryOne<any>(totalSql, params);
  const total = totalRow?.total || 0;

  return success(res, { list, total, page, pageSize });
}

// ============================================================
// 3. GET /api/ticket/:id  工单详情(主表 + 完整流转日志时间线)
// ============================================================
export async function getTicketDetail(req: Request, res: Response) {
  const { userId, isAdmin } = await currentUser(req);
  const id = parseInt(req.params.id);

  const ticket = await queryOne<any>(
    `SELECT t.*, u.nickname AS creator_name, u2.nickname AS current_approver_name
     FROM ticket t
     LEFT JOIN user u  ON u.id  = t.creator_id
     LEFT JOIN user u2 ON u2.id = t.current_approver_id
     WHERE t.id = ?`,
    [id]
  );
  if (!ticket) {
    return fail(res, '工单不存在', 1, 404);
  }

  // 数据权限:非管理员只能查看自己发起的 / 待自己审批的工单
  if (!isAdmin && ticket.creator_id !== userId && ticket.current_approver_id !== userId) {
    return fail(res, '无权查看该工单', 1, 403);
  }

  const logs = await query<TicketLogWithOperator>(
    `SELECT l.*, u.nickname AS operator_name
     FROM ticket_log l
     LEFT JOIN user u ON u.id = l.operator_id
     WHERE l.ticket_id = ?
     ORDER BY l.id ASC`,
    [id]
  );

  const detail: TicketDetail = { ...ticket, logs };
  return success(res, detail);
}

// ============================================================
// 4. POST /api/ticket/:id/action  流转操作(状态机驱动 + 乐观锁)
//    body: { action: 'submit'|'approve'|'reject'|'withdraw'|'close', remark? }
// ============================================================
export async function doTicketAction(req: Request, res: Response) {
  const { userId, isAdmin } = await currentUser(req);
  const id = parseInt(req.params.id);
  const { action, remark = '' } = (req.body || {}) as TicketActionBody;

  if (!action) {
    return fail(res, 'action 不能为空');
  }

  // 1. 查询工单当前状态
  const ticket = await queryOne<any>(
    'SELECT id, status, creator_id, current_approver_id FROM ticket WHERE id = ?',
    [id]
  );
  if (!ticket) {
    return fail(res, '工单不存在', 1, 404);
  }

  // 2. 操作权限校验:仅发起人/当前审批人可操作
  const hasPermission = canPerformAction(
    action,
    userId,
    ticket.creator_id,
    ticket.current_approver_id
  );
  // close 动作:admin 也可执行(兜底)
  if (!hasPermission && !(action === 'close' && isAdmin)) {
    return fail(res, '无权执行该操作', 1, 403);
  }

  // 3. 状态机校验:转换表查 from + action -> to
  const fromStatus: TicketStatus = ticket.status;
  if (isTerminalStatus(fromStatus)) {
    return fail(res, `工单已处于终态(${fromStatus}),不可再流转`, 1, 422);
  }
  const toStatus = canTransition(fromStatus, action);
  if (!toStatus) {
    // 非法流转(如对已通过工单执行 approve)
    return fail(res, `非法流转:${fromStatus} -> ${action}`, 1, 422);
  }

  // 4. 计算流转后的 current_approver_id
  //    - approved / rejected:终态,清空审批人
  //    - 其他状态:保持原审批人(含撤回到 draft,再提交时仍走同一审批人)
  let nextApproverId: number | null = ticket.current_approver_id;
  if (toStatus === 'approved' || toStatus === 'rejected') {
    nextApproverId = null;
  }

  // 5. 乐观锁:UPDATE 时带 WHERE status = ?,影响行数为 0 说明已被并发改动
  const updateResult: any = await queryOne<any>(
    `UPDATE ticket
       SET status = ?, current_approver_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = ?
     RETURNING id`,
    [toStatus, nextApproverId, id, fromStatus]
  );
  if (!updateResult) {
    return fail(res, '工单状态已被其他人变更,请刷新后重试', 1, 409);
  }

  // 6. 落审计日志(状态变更与主表更新保持原子性:此处同一进程内顺序写,
  //    严格一致可包 BEGIN/COMMIT,本期 MVP 用顺序写)
  await query(
    `INSERT INTO ticket_log (ticket_id, operator_id, action, from_status, to_status, remark)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, action, fromStatus, toStatus, remark]
  );

  return success(res, { id, status: toStatus }, '操作成功');
}

// ============================================================
// 5. GET /api/ticket/stats  首页统计卡片数据
// ============================================================
export async function getTicketStats(req: Request, res: Response) {
  const { userId, isAdmin } = await currentUser(req);

  // 总数 / 待审批 / 已通过 / 已驳回
  const overall = await queryOne<any>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status IN ('pending','approving') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
     FROM ticket`
  );

  // 我发起的 / 待我审批的(管理员也能看,展示个人视角)
  const mine = await queryOne<any>(
    `SELECT
       SUM(CASE WHEN creator_id = ? THEN 1 ELSE 0 END) AS myCreated,
       SUM(CASE WHEN current_approver_id = ? THEN 1 ELSE 0 END) AS myPendingApprove
     FROM ticket`,
    [userId, userId]
  );

  const stats: TicketStats = {
    total: overall?.total || 0,
    pending: overall?.pending || 0,
    approved: overall?.approved || 0,
    rejected: overall?.rejected || 0,
    myCreated: mine?.myCreated || 0,
    myPendingApprove: mine?.myPendingApprove || 0,
  };

  // 标记 isAdmin 给前端判断是否显示全部统计卡片
  return success(res, { ...stats, isAdmin });
}

// ============================================================
// 6. GET /api/ticket/trend  近 7 天每日工单「创建数 / 审批通过数」
//    返回结构: { dates: [...7], created: [...7], approved: [...7] }
//    用于首页折线图
// ============================================================
export async function getTicketTrend(req: Request, res: Response) {
  // SQLite 用 date() 函数取日期字符串,按天分组
  // 注:演示数据 created_at 都是同一时刻,趋势图会集中在某一天;真实业务下会有分布
  const rows = await query<any>(
    `SELECT
       date(created_at) AS day,
       COUNT(*) AS created_count
     FROM ticket
     WHERE created_at >= date('now', '-6 days')
     GROUP BY date(created_at)
     ORDER BY day ASC`
  );

  // 审批通过数:取 ticket_log 中 action='approve' 且 to_status='approved' 的记录
  const approveRows = await query<any>(
    `SELECT
       date(l.created_at) AS day,
       COUNT(*) AS approved_count
     FROM ticket_log l
     WHERE l.action = 'approve'
       AND l.to_status = 'approved'
       AND l.created_at >= date('now', '-6 days')
     GROUP BY date(l.created_at)
     ORDER BY day ASC`
  );

  // 组装连续 7 天的数组(缺失日期补 0,保证图表 x 轴连续)
  const today = new Date();
  const createdMap: Record<string, number> = {};
  const approvedMap: Record<string, number> = {};

  rows.forEach((r: any) => { createdMap[r.day] = r.created_count; });
  approveRows.forEach((r: any) => { approvedMap[r.day] = r.approved_count; });

  const fullDates: string[] = [];
  const createdArr: number[] = [];
  const approvedArr: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    fullDates.push(dayStr.slice(5)); // MM-DD
    createdArr.push(createdMap[dayStr] || 0);
    approvedArr.push(approvedMap[dayStr] || 0);
  }

  return success(res, { dates: fullDates, created: createdArr, approved: approvedArr });
}

// ============================================================
// 7. GET /api/ticket/distribution  状态分布 + 优先级分布
//    返回: { status: [{name,value}], priority: [{name,value}] }
//    用于首页饼图(2 张)
// ============================================================
export async function getTicketDistribution(req: Request, res: Response) {
  const statusRows = await query<any>(
    `SELECT status, COUNT(*) AS count FROM ticket GROUP BY status`
  );
  const priorityRows = await query<any>(
    `SELECT priority, COUNT(*) AS count FROM ticket GROUP BY priority`
  );

  // 状态中文标签映射(与 ticket-fsm.ts 保持一致)
  const statusLabels: Record<string, string> = {
    draft: '草稿', pending: '待审批', approving: '审批中',
    approved: '已通过', rejected: '已驳回', closed: '已关闭',
  };
  const priorityLabels: Record<string, string> = {
    low: '低', normal: '中', high: '高', urgent: '紧急',
  };

  const status = statusRows.map((r: any) => ({
    name: statusLabels[r.status] || r.status,
    value: r.count,
  }));
  const priority = priorityRows.map((r: any) => ({
    name: priorityLabels[r.priority] || r.priority,
    value: r.count,
  }));

  return success(res, { status, priority });
}

// ============================================================
// 8. GET /api/ticket/recent-logs  最近 5 条流转日志(首页时间线)
//    返回: [{ id, ticket_id, title, action, operator_name, remark, created_at }]
// ============================================================
export async function getRecentTicketLogs(req: Request, res: Response) {
  const logs = await query<any>(
    `SELECT l.id, l.ticket_id, t.title, l.action, l.remark,
            u.nickname AS operator_name, l.created_at
     FROM ticket_log l
     JOIN ticket t ON t.id = l.ticket_id
     LEFT JOIN user u ON u.id = l.operator_id
     ORDER BY l.id DESC
     LIMIT 5`
  );
  return success(res, logs);
}

// ============================================================
// 9. GET /api/ticket/top-creators  发起人工单数 Top5(首页排行榜)
//    返回: [{ user_id, nickname, username, count }]
// ============================================================
export async function getTopCreators(req: Request, res: Response) {
  const rows = await query<any>(
    `SELECT t.creator_id AS user_id,
            u.nickname, u.username,
            COUNT(*) AS count
     FROM ticket t
     LEFT JOIN user u ON u.id = t.creator_id
     GROUP BY t.creator_id
     ORDER BY count DESC
     LIMIT 5`
  );
  return success(res, rows);
}
