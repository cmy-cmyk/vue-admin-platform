import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import {
    getRoleList,
    getRolePage,
    createRole,
    updateRole,
    deleteRole,
    getRoleMenus,
    assignRoleMenus,
} from '../controllers/role.controller';

const router = Router();

router.use(authRequired);

router.get('/list', getRoleList);
router.get('/page', getRolePage);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);
router.get('/:id/menus', getRoleMenus);
router.put('/:id/menus', assignRoleMenus);

export default router;
