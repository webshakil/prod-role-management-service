import roleModel from '../models/roleModel.js';
import { successResponse, errorResponse, asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class RoleController {
  // Get all roles
  getAllRoles = asyncHandler(async (req, res) => {
    const { role_type, role_category, is_active } = req.query;

    const filters = {};
    if (role_type) filters.role_type = role_type;
    if (role_category) filters.role_category = role_category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const roles = await roleModel.getAllRoles(filters);

    return successResponse(res, roles, 'Roles retrieved successfully');
  });

  // Get role by ID
  getRoleById = asyncHandler(async (req, res) => {
    const { roleId } = req.params;

    const role = await roleModel.getRoleById(roleId);

    if (!role) {
      return errorResponse(res, 'Role not found', 404);
    }

    return successResponse(res, role, 'Role retrieved successfully');
  });

  // Get role by name
  getRoleByName = asyncHandler(async (req, res) => {
    const { roleName } = req.params;

    const role = await roleModel.getRoleByName(roleName);

    if (!role) {
      return errorResponse(res, 'Role not found', 404);
    }

    return successResponse(res, role, 'Role retrieved successfully');
  });

  // Create new role (Admin only)
  createRole = asyncHandler(async (req, res) => {
    const {
      role_name,
      role_type,
      role_category,
      description,
      is_default,
      requires_subscription,
      requires_action_trigger,
      action_trigger
    } = req.body;

    // Validation
    if (!role_name || !role_type) {
      return errorResponse(res, 'Role name and type are required', 400);
    }

    const newRole = await roleModel.createRole({
      role_name,
      role_type,
      role_category,
      description,
      is_default,
      requires_subscription,
      requires_action_trigger,
      action_trigger
    });

    logger.info(`New role created: ${role_name} by user ${req.user?.id}`);

    return successResponse(res, newRole, 'Role created successfully', 201);
  });

  // Update role (Admin only)
  updateRole = asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const updateData = req.body;

    const existingRole = await roleModel.getRoleById(roleId);
    if (!existingRole) {
      return errorResponse(res, 'Role not found', 404);
    }

    const updatedRole = await roleModel.updateRole(roleId, updateData);

    logger.info(`Role updated: ${roleId} by user ${req.user?.id}`);

    return successResponse(res, updatedRole, 'Role updated successfully');
  });

  // Delete role (Admin only)
  deleteRole = asyncHandler(async (req, res) => {
    const { roleId } = req.params;

    const existingRole = await roleModel.getRoleById(roleId);
    if (!existingRole) {
      return errorResponse(res, 'Role not found', 404);
    }

    const deletedRole = await roleModel.deleteRole(roleId);

    logger.info(`Role deleted: ${roleId} by user ${req.user?.id}`);

    return successResponse(res, deletedRole, 'Role deleted successfully');
  });

  // Get user's roles
  getUserRoles = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const userRoles = await roleModel.getUserRoles(userId);

    return successResponse(res, userRoles, 'User roles retrieved successfully');
  });

  // Get user's permissions
  getUserPermissions = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const permissions = await roleModel.getUserPermissions(userId);

    return successResponse(res, permissions, 'User permissions retrieved successfully');
  });

  // Check if user has role
  checkUserRole = asyncHandler(async (req, res) => {
    const { userId, roleName } = req.params;

    const hasRole = await roleModel.userHasRole(userId, roleName);

    return successResponse(
      res,
      { hasRole, userId, roleName },
      hasRole ? 'User has the role' : 'User does not have the role'
    );
  });

  // Check if user has permission
  checkUserPermission = asyncHandler(async (req, res) => {
    const { userId, permissionName } = req.params;

    const hasPermission = await roleModel.userHasPermission(userId, permissionName);

    return successResponse(
      res,
      { hasPermission, userId, permissionName },
      hasPermission ? 'User has the permission' : 'User does not have the permission'
    );
  });

  // Invalidate user cache
  invalidateCache = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    await roleModel.invalidateUserCache(userId);

    return successResponse(res, null, 'User cache invalidated successfully');
  });
}

export default new RoleController();