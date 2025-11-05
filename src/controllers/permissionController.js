import permissionModel from '../models/permissionModel.js';
import { successResponse, errorResponse, asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class PermissionController {
  // Get all permissions
  getAllPermissions = asyncHandler(async (req, res) => {
    const { permission_category, resource_type, action_type, is_active } = req.query;

    const filters = {};
    if (permission_category) filters.permission_category = permission_category;
    if (resource_type) filters.resource_type = resource_type;
    if (action_type) filters.action_type = action_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const permissions = await permissionModel.getAllPermissions(filters);

    return successResponse(res, permissions, 'Permissions retrieved successfully');
  });

  // Get permission by ID
  getPermissionById = asyncHandler(async (req, res) => {
    const { permissionId } = req.params;

    const permission = await permissionModel.getPermissionById(permissionId);

    if (!permission) {
      return errorResponse(res, 'Permission not found', 404);
    }

    return successResponse(res, permission, 'Permission retrieved successfully');
  });

  // Create new permission (Admin only)
  createPermission = asyncHandler(async (req, res) => {
    const {
      permission_name,
      permission_category,
      description,
      resource_type,
      action_type
    } = req.body;

    // Validation
    if (!permission_name || !permission_category || !resource_type || !action_type) {
      return errorResponse(res, 'All fields are required', 400);
    }

    const newPermission = await permissionModel.createPermission({
      permission_name,
      permission_category,
      description,
      resource_type,
      action_type
    });

    logger.info(`New permission created: ${permission_name} by user ${req.user?.id}`);

    return successResponse(res, newPermission, 'Permission created successfully', 201);
  });

  // Update permission (Admin only)
  updatePermission = asyncHandler(async (req, res) => {
    const { permissionId } = req.params;
    const updateData = req.body;

    const existingPermission = await permissionModel.getPermissionById(permissionId);
    if (!existingPermission) {
      return errorResponse(res, 'Permission not found', 404);
    }

    const updatedPermission = await permissionModel.updatePermission(permissionId, updateData);

    logger.info(`Permission updated: ${permissionId} by user ${req.user?.id}`);

    return successResponse(res, updatedPermission, 'Permission updated successfully');
  });

  // Delete permission (Admin only)
  deletePermission = asyncHandler(async (req, res) => {
    const { permissionId } = req.params;

    const existingPermission = await permissionModel.getPermissionById(permissionId);
    if (!existingPermission) {
      return errorResponse(res, 'Permission not found', 404);
    }

    const deletedPermission = await permissionModel.deletePermission(permissionId);

    logger.info(`Permission deleted: ${permissionId} by user ${req.user?.id}`);

    return successResponse(res, deletedPermission, 'Permission deleted successfully');
  });

  // Get permissions for a role
  getRolePermissions = asyncHandler(async (req, res) => {
    const { roleId } = req.params;

    const permissions = await permissionModel.getRolePermissions(roleId);

    return successResponse(res, permissions, 'Role permissions retrieved successfully');
  });

  // Assign permission to role
  assignPermissionToRole = asyncHandler(async (req, res) => {
    const { roleId, permissionId } = req.body;

    if (!roleId || !permissionId) {
      return errorResponse(res, 'Role ID and Permission ID are required', 400);
    }

    const assignment = await permissionModel.assignPermissionToRole(roleId, permissionId);

    logger.info(`Permission ${permissionId} assigned to role ${roleId} by user ${req.user?.id}`);

    return successResponse(res, assignment, 'Permission assigned to role successfully');
  });

  // Remove permission from role
  removePermissionFromRole = asyncHandler(async (req, res) => {
    const { roleId, permissionId } = req.body;

    if (!roleId || !permissionId) {
      return errorResponse(res, 'Role ID and Permission ID are required', 400);
    }

    await permissionModel.removePermissionFromRole(roleId, permissionId);

    logger.info(`Permission ${permissionId} removed from role ${roleId} by user ${req.user?.id}`);

    return successResponse(res, null, 'Permission removed from role successfully');
  });

  // Bulk assign permissions to role
  bulkAssignPermissions = asyncHandler(async (req, res) => {
    const { roleId, permissionIds } = req.body;

    if (!roleId || !permissionIds || !Array.isArray(permissionIds)) {
      return errorResponse(res, 'Role ID and array of Permission IDs are required', 400);
    }

    const assignments = await permissionModel.bulkAssignPermissions(roleId, permissionIds);

    logger.info(`Bulk permissions assigned to role ${roleId} by user ${req.user?.id}`);

    return successResponse(res, assignments, 'Permissions assigned to role successfully');
  });
}

export default new PermissionController();