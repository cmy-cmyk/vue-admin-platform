import { Router } from 'express';
import { login, refresh, userInfo, logout } from '../controllers/auth.controller';
import { authRequired } from '../middleware/auth';

const router = Router();

// 公开接口
router.post('/login', login);
router.post('/refresh', refresh);

// 鉴权接口
router.get('/user-info', authRequired, userInfo);
router.post('/logout', authRequired, logout);

export default router;
