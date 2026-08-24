import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import roleRoutes from './role';
import menuRoutes from './menu';
import ticketRoutes from './ticket';

const router = Router();

// 所有业务接口统一前缀 /api
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/role', roleRoutes);
router.use('/menu', menuRoutes);
router.use('/ticket', ticketRoutes);

// 简单健康检查
router.get('/health', (_req, res) => {
    res.json({ code: 0, message: 'ok', data: { status: 'up' } });
});

export default router;
