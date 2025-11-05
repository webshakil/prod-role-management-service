import express from 'express';
import roleController from '../controllers/roleController.js';
import { requireAdmin, requireRole, attachUserInfo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public/authenticated routes
router.get('/roles', attachUserInfo, roleController.getAllRoles);
router.get('/roles/:roleId', attachUserInfo, roleController.getRoleById);
router.get('/roles/name/:roleName', attachUserInfo, roleController.getRoleByName);

// User-specific routes
router.get('/users/:userId/roles', attachUserInfo, roleController.getUserRoles);
router.get('/users/:userId/permissions', attachUserInfo, roleController.getUserPermissions);
router.get('/users/:userId/roles/:roleName/check', attachUserInfo, roleController.checkUserRole);
router.get('/users/:userId/permissions/:permissionName/check', attachUserInfo, roleController.checkUserPermission);

// Admin routes
router.post('/roles', requireRole('Manager', 'Admin'), roleController.createRole);
router.put('/roles/:roleId', requireRole('Manager', 'Admin'), roleController.updateRole);
router.delete('/roles/:roleId', requireRole('Manager'), roleController.deleteRole);
router.post('/users/:userId/cache/invalidate', requireRole('Manager', 'Admin'), roleController.invalidateCache);

export default router;