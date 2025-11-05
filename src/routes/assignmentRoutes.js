import express from 'express';
import assignmentController from '../controllers/assignmentController.js';
import { requireRole, attachUserInfo } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Get all role assignments (with filters)
router.get('/assignments', requireRole('Manager', 'Admin'), assignmentController.getRoleAssignments);

// Assign role to user
router.post('/assignments', requireRole('Manager', 'Admin'), assignmentController.assignRole);

// Deactivate role assignment
router.post('/assignments/deactivate', requireRole('Manager', 'Admin'), assignmentController.deactivateRoleAssignment);

// Reactivate role assignment
router.post('/assignments/reactivate', requireRole('Manager', 'Admin'), assignmentController.reactivateRoleAssignment);
router.delete('/assignments', requireRole('Manager', 'Admin'), assignmentController.deleteRoleAssignment);

// Get user's role assignment history
router.get('/users/:userId/assignment-history', attachUserInfo, assignmentController.getUserRoleHistory);

export default router;