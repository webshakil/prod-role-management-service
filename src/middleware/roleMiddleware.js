import { errorResponse } from '../utils/helpers.js';
import roleModel from '../models/roleModel.js';
import logger from '../utils/logger.js';

// Middleware to check if user has specific role(s)
export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return errorResponse(res, 'User ID required in headers', 401);
      }

      // Get user's active roles
      const userRoles = await roleModel.getUserRoles(userId);

      if (!userRoles || userRoles.length === 0) {
        return errorResponse(res, 'No roles assigned to user', 403);
      }

      // Check if user has any of the allowed roles
      const hasRole = userRoles.some(role => 
        allowedRoles.includes(role.role_name)
      );

      if (!hasRole) {
        logger.warn(`Access denied for user ${userId}. Required: ${allowedRoles.join(', ')}`);
        return errorResponse(
          res, 
          'Insufficient permissions', 
          403,
          { required: allowedRoles, userRoles: userRoles.map(r => r.role_name) }
        );
      }

      req.user = { 
        id: userId, 
        roles: userRoles.map(r => r.role_name) 
      };
      next();
    } catch (error) {
      logger.error('Role check middleware error:', error);
      return errorResponse(res, 'Role verification failed', 500);
    }
  };
};

// Middleware to check if user has specific permission(s)
export const requirePermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return errorResponse(res, 'User ID required in headers', 401);
      }

      // Get user's permissions from cache or calculate
      const userPermissions = await roleModel.getUserPermissions(userId);

      if (!userPermissions || userPermissions.length === 0) {
        return errorResponse(res, 'No permissions assigned to user', 403);
      }

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(perm =>
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        logger.warn(`Permission denied for user ${userId}. Required: ${requiredPermissions.join(', ')}`);
        return errorResponse(
          res,
          'Insufficient permissions',
          403,
          { required: requiredPermissions, userPermissions }
        );
      }

      req.user = {
        id: userId,
        permissions: userPermissions
      };
      next();
    } catch (error) {
      logger.error('Permission check middleware error:', error);
      return errorResponse(res, 'Permission verification failed', 500);
    }
  };
};

// Middleware to check if user is admin (any admin role)
export const requireAdmin = () => {
  return requireRole('Manager', 'Admin', 'Moderator', 'Auditor', 'Editor', 'Advertiser', 'Analyst');
};

// Middleware to attach user info without blocking request
export const attachUserInfo = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    if (userId) {
      const userRoles = await roleModel.getUserRoles(userId);
      const userPermissions = await roleModel.getUserPermissions(userId);

      req.user = {
        id: userId,
        roles: userRoles.map(r => r.role_name),
        permissions: userPermissions
      };
    }

    next();
  } catch (error) {
    logger.error('Attach user info error:', error);
    next();
  }
};

export default {
  requireRole,
  requirePermission,
  requireAdmin,
  attachUserInfo
};