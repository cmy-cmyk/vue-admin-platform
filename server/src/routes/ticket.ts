import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import {
  createTicket,
  getTicketList,
  getTicketDetail,
  doTicketAction,
  getTicketStats,
} from '../controllers/ticket.controller';

const router = Router();

// 工单接口全部需要登录(RBAC 按钮权限由前端 v-permiss 控制,
// 后端业务层做数据权限校验,见 controller)
router.use(authRequired);

// 列表 + 创建(根路径)
router.get('/', getTicketList);
router.post('/', createTicket);

// /stats 必须在 /:id 之前注册,否则会被 :id='stats' 匹配导致 404
router.get('/stats', getTicketStats);

// 详情 + 流转(带 id 路径)
router.get('/:id', getTicketDetail);
router.post('/:id/action', doTicketAction);

export default router;
