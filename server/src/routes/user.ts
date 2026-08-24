import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import {
    getUserList,
    createUser,
    updateUser,
    deleteUser,
    batchDeleteUser,
    updateUserStatus,
    resetUserPassword,
    getUserRoles,
    assignUserRoles,
} from '../controllers/user.controller';

const router = Router();

router.use(authRequired); // 用户管理所有接口都需要登录

router.get('/list', getUserList);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/batch', batchDeleteUser);
router.put('/:id/status', updateUserStatus);
router.put('/:id/reset-password', resetUserPassword);
router.get('/:id/roles', getUserRoles);
router.put('/:id/roles', assignUserRoles);

export default router;
