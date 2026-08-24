import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import {
    getMenuTree,
    getMenuList,
    createMenu,
    updateMenu,
    deleteMenu,
} from '../controllers/menu.controller';

const router = Router();

router.use(authRequired);

router.get('/tree', getMenuTree);
router.get('/list', getMenuList);
router.post('/', createMenu);
router.put('/:id', updateMenu);
router.delete('/:id', deleteMenu);

export default router;
