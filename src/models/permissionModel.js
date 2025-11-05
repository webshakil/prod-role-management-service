import pool from '../config/database.js';
import logger from '../utils/logger.js';

class PermissionModel {
  // Get all permissions
  async getAllPermissions(filters = {}) {
    try {
      let query = `
        SELECT 
          permission_id, permission_name, permission_category, description,
          resource_type, action_type, is_active, created_at
        FROM votteryy_permissions
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (filters.permission_category) {
        query += ` AND permission_category = $${paramCount}`;
        params.push(filters.permission_category);
        paramCount++;
      }

      if (filters.resource_type) {
        query += ` AND resource_type = $${paramCount}`;
        params.push(filters.resource_type);
        paramCount++;
      }

      if (filters.action_type) {
        query += ` AND action_type = $${paramCount}`;
        params.push(filters.action_type);
        paramCount++;
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        params.push(filters.is_active);
        paramCount++;
      }

      query += ` ORDER BY permission_category, permission_name`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching permissions:', error);
      throw error;
    }
  }

  // Get permission by ID
  async getPermissionById(permissionId) {
    try {
      const result = await pool.query(
        'SELECT * FROM votteryy_permissions WHERE permission_id = $1',
        [permissionId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching permission by ID:', error);
      throw error;
    }
  }

  // Get permission by name
  async getPermissionByName(permissionName) {
    try {
      const result = await pool.query(
        'SELECT * FROM votteryy_permissions WHERE permission_name = $1',
        [permissionName]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching permission by name:', error);
      throw error;
    }
  }

  // Create new permission
  async createPermission(permissionData) {
    try {
      const result = await pool.query(
        `INSERT INTO votteryy_permissions (
          permission_name, permission_category, description,
          resource_type, action_type
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          permissionData.permission_name,
          permissionData.permission_category,
          permissionData.description,
          permissionData.resource_type,
          permissionData.action_type
        ]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating permission:', error);
      throw error;
    }
  }

  // Update permission
  async updatePermission(permissionId, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && key !== 'permission_id') {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      values.push(permissionId);

      const query = `
        UPDATE votteryy_permissions 
        SET ${fields.join(', ')}
        WHERE permission_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating permission:', error);
      throw error;
    }
  }

  // Delete permission (soft delete)
  async deletePermission(permissionId) {
    try {
      const result = await pool.query(
        `UPDATE votteryy_permissions 
         SET is_active = false
         WHERE permission_id = $1
         RETURNING *`,
        [permissionId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting permission:', error);
      throw error;
    }
  }

  // Get permissions for a specific role
  async getRolePermissions(roleId) {
    try {
      const result = await pool.query(
        `SELECT 
          p.permission_id, p.permission_name, p.permission_category,
          p.description, p.resource_type, p.action_type,
          rp.is_granted, rp.granted_at
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
        `DELETE FROM votteryy_role_permissions
         WHERE role_id = $1 AND permission_id = $2
         RETURNING *`,
        [roleId, permissionId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error removing permission from role:', error);
      throw error;
    }
  }

  // Bulk assign permissions to role
  async bulkAssignPermissions(roleId, permissionIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertValues = permissionIds.map((permId, index) => 
        `($1, $${index + 2}, true)`
      ).join(', ');

      const query = `
        INSERT INTO votteryy_role_permissions (role_id, permission_id, is_granted)
        VALUES ${insertValues}
        ON CONFLICT (role_id, permission_id) 
        DO UPDATE SET is_granted = true, granted_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await client.query(query, [roleId, ...permissionIds]);

      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error bulk assigning permissions:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new PermissionModel();