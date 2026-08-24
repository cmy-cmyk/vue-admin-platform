import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import {
  getMessageList,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/message.controller';

const router = Router();

// 消息中心接口全部需要登录,只能看自己的消息(controller 内按 userId 过滤)
router.use(authRequired);

// 未读数(高频,放前面)
router.get('/unread-count', getUnreadCount);

// 列表(支持 ?type=&is_read=&page=&page_size=)
router.get('/', getMessageList);

// 全部已读(放 /:id 之前,避免被 :id='read-all' 匹配)
router.post('/read-all', markAllAsRead);

// 单条已读
router.post('/:id/read', markAsRead);

export default router;
