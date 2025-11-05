import express from 'express';
import permissionController from '../controllers/permissionController.js';
import { requireRole, attachUserInfo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public/authenticated routes
router.get('/permissions', attachUserInfo, permissionController.getAllPermissions);
router.get('/permissions/:permissionId', attachUserInfo, permissionController.getPermissionById);
router.get('/roles/:roleId/permissions', attachUserInfo, permissionController.getRolePermissions);

// Admin routes
router.post('/permissions', requireRole('Manager', 'Admin'), permissionController.createPermission);
router.put('/permissions/:permissionId', requireRole('Manager', 'Admin'), permissionController.updatePermission);
router.delete('/permissions/:permissionId', requireRole('Manager'), permissionController.deletePermission);
router.post('/role-permissions/assign', requireRole('Manager', 'Admin'), permissionController.assignPermissionToRole);
router.post('/role-permissions/remove', requireRole('Manager', 'Admin'), permissionController.removePermissionFromRole);
router.post('/role-permissions/bulk-assign', requireRole('Manager', 'Admin'), permissionController.bulkAssignPermissions);

export default router;