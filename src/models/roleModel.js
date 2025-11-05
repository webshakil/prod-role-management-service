import pool from '../config/database.js';
import logger from '../utils/logger.js';
import NodeCache from 'node-cache';

// Cache for user roles and permissions (TTL: 5 minutes)
const roleCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

class RoleModel {
  // ==================== ROLE CRUD ====================

  // Get all roles with optional filters
  async getAllRoles(filters = {}) {
    try {
      let query = 'SELECT * FROM votteryy_roles WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.role_type) {
        query += ` AND role_type = $${paramCount}`;
        params.push(filters.role_type);
        paramCount++;
      }

      if (filters.role_category) {
        query += ` AND role_category = $${paramCount}`;
        params.push(filters.role_category);
        paramCount++;
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(filters.is_active);
        paramCount++;
      }

      query += ' ORDER BY role_type, role_name';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching roles:', error);
      throw error;
    }
  }

  // Get single role by ID
  async getRoleById(roleId) {
    try {
      const result = await pool.query(
        'SELECT * FROM votteryy_roles WHERE role_id = $1',
        [roleId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching role by ID:', error);
      throw error;
    }
  }

  // Get role by name
  async getRoleByName(roleName) {
    try {
      const result = await pool.query(
        'SELECT * FROM votteryy_roles WHERE role_name = $1',
        [roleName]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching role by name:', error);
      throw error;
    }
  }

  // Create new role
  async createRole(roleData) {
    try {
      const {
        role_name,
        role_type,
        role_category,
        description,
        is_default = false,
        requires_subscription = false,
        requires_action_trigger = false,
        action_trigger,
      } = roleData;

      const result = await pool.query(
        `INSERT INTO votteryy_roles 
        (role_name, role_type, role_category, description, is_default, 
         requires_subscription, requires_action_trigger, action_trigger)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          role_name,
          role_type,
          role_category,
          description,
          is_default,
          requires_subscription,
          requires_action_trigger,
          action_trigger,
        ]
      );

      logger.info(`Role created: ${role_name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating role:', error);
      throw error;
    }
  }

  // Update role
  async updateRole(roleId, roleData) {
    try {
      const {
        role_name,
        role_type,
        role_category,
        description,
        is_default,
        requires_subscription,
        requires_action_trigger,
        action_trigger,
        is_active,
      } = roleData;

      const result = await pool.query(
        `UPDATE votteryy_roles 
        SET role_name = COALESCE($1, role_name),
            role_type = COALESCE($2, role_type),
            role_category = COALESCE($3, role_category),
            description = COALESCE($4, description),
            is_default = COALESCE($5, is_default),
            requires_subscription = COALESCE($6, requires_subscription),
            requires_action_trigger = COALESCE($7, requires_action_trigger),
            action_trigger = COALESCE($8, action_trigger),
            is_active = COALESCE($9, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE role_id = $10
        RETURNING *`,
        [
          role_name,
          role_type,
          role_category,
          description,
          is_default,
          requires_subscription,
          requires_action_trigger,
          action_trigger,
          is_active,
          roleId,
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Role updated: ${roleId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating role:', error);
      throw error;
    }
  }

  // Delete role
  async deleteRole(roleId) {
    try {
      const result = await pool.query(
        'DELETE FROM votteryy_roles WHERE role_id = $1 RETURNING *',
        [roleId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Role deleted: ${roleId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting role:', error);
      throw error;
    }
  }

  // ==================== USER ROLES ====================

  // Get user's active roles (✅ UPDATED to use votteryy_user_roles)
  async getUserRoles(userId) {
    try {
      // Check cache first
      const cacheKey = `user_roles_${userId}`;
      const cached = roleCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await pool.query(
        `SELECT 
          ur.id as assignment_id,
          ur.user_id,
          ur.role_name,
          ur.is_active,
          ur.assigned_at,
          ur.assigned_by,
          ur.assignment_type,
          ur.assignment_source,
          ur.expires_at,
          ur.metadata,
          r.role_id,
          r.role_type,
          r.role_category,
          r.description
        FROM votteryy_user_roles ur
        LEFT JOIN votteryy_roles r ON ur.role_name = r.role_name
        WHERE ur.user_id = $1 AND ur.is_active = true
        ORDER BY ur.assigned_at DESC`,
        [userId]
      );

      // Cache the result
      roleCache.set(cacheKey, result.rows);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching user roles:', error);
      throw error;
    }
  }

  // Get user's permissions (from all their roles)
  async getUserPermissions(userId) {
    try {
      // Check cache first
      const cacheKey = `user_permissions_${userId}`;
      const cached = roleCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const result = await pool.query(
        `SELECT DISTINCT p.permission_name
        FROM votteryy_user_roles ur
        JOIN votteryy_roles r ON ur.role_name = r.role_name
        JOIN votteryy_role_permissions rp ON r.role_id = rp.role_id
        JOIN votteryy_permissions p ON rp.permission_id = p.permission_id
        WHERE ur.user_id = $1 
          AND ur.is_active = true
          AND r.is_active = true
          AND p.is_active = true
          AND rp.is_granted = true
        ORDER BY p.permission_name`,
        [userId]
      );

      const permissions = result.rows.map((row) => row.permission_name);

      // Cache the result
      roleCache.set(cacheKey, permissions);
      return permissions;
    } catch (error) {
      logger.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  // Invalidate user cache
  async invalidateUserCache(userId) {
    roleCache.del(`user_roles_${userId}`);
    roleCache.del(`user_permissions_${userId}`);
    logger.info(`Cache invalidated for user: ${userId}`);
  }

  // ==================== ROLE PERMISSIONS ====================

  // Get permissions for a role
  async getRolePermissions(roleId) {
    try {
      const result = await pool.query(
        `SELECT 
          p.permission_id,
          p.permission_name,
          p.permission_category,
          p.description,
          p.resource_type,
          p.action_type,
          rp.is_granted,
          rp.granted_at
        FROM votteryy_role_permissions rp
        JOIN votteryy_permissions p ON rp.permission_id = p.permission_id
        WHERE rp.role_id = $1 AND p.is_active = true
        ORDER BY p.permission_category, p.permission_name`,
        [roleId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching role permissions:', error);
      throw error;
    }
  }

  // Assign permission to role
  async assignPermissionToRole(roleId, permissionId) {
    try {
      const result = await pool.query(
        `INSERT INTO votteryy_role_permissions (role_id, permission_id, is_granted)
        VALUES ($1, $2, true)
        ON CONFLICT (role_id, permission_id) 
        DO UPDATE SET is_granted = true, granted_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [roleId, permissionId]
      );

      logger.info(`Permission ${permissionId} assigned to role ${roleId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error assigning permission to role:', error);
      throw error;
    }
  }

  // Remove permission from role
  async removePermissionFromRole(roleId, permissionId) {
    try {
      const result = await pool.query(
        'DELETE FROM votteryy_role_permissions WHERE role_id = $1 AND permission_id = $2 RETURNING *',
        [roleId, permissionId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      logger.info(`Permission ${permissionId} removed from role ${roleId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error removing permission from role:', error);
      throw error;
    }
  }
}

export default new RoleModel();