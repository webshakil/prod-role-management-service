import pool from '../config/database.js';
import logger from '../utils/logger.js';
import roleModel from './roleModel.js';

class AssignmentModel {
  // Get all role assignments with filters
  async getRoleAssignments(filters = {}) {
    try {
      let query = `
        SELECT 
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
          ur.deactivated_at,
          ur.deactivated_by,
          ur.deactivation_reason,
          r.role_id,
          r.role_type,
          r.role_category,
          u.user_email,
          assigner.user_email as assigned_by_email
        FROM votteryy_user_roles ur
        LEFT JOIN votteryy_roles r ON ur.role_name = r.role_name
        LEFT JOIN public.users u ON ur.user_id = u.user_id
        LEFT JOIN public.users assigner ON ur.assigned_by = assigner.user_id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (filters.user_id) {
        query += ` AND ur.user_id = $${paramCount}`;
        params.push(filters.user_id);
        paramCount++;
      }

      if (filters.role_name) {
        query += ` AND ur.role_name = $${paramCount}`;
        params.push(filters.role_name);
        paramCount++;
      }

      if (filters.is_active !== undefined) {
        query += ` AND ur.is_active = $${paramCount}`;
        params.push(filters.is_active);
        paramCount++;
      }

      if (filters.assignment_type) {
        query += ` AND ur.assignment_type = $${paramCount}`;
        params.push(filters.assignment_type);
        paramCount++;
      }

      if (filters.assignment_source) {
        query += ` AND ur.assignment_source = $${paramCount}`;
        params.push(filters.assignment_source);
        paramCount++;
      }

      query += ` ORDER BY ur.assigned_at DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching role assignments:', error);
      throw error;
    }
  }

  // ✅ FIXED: Assign role to user (NEVER touches other roles - only adds/updates specific role)
  async assignRole(userId, roleName, assignmentData = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        assigned_by = null,
        assignment_type = 'manual',
        assignment_source = 'role_service',
        expires_at = null,
        metadata = null,
      } = assignmentData;

      logger.info(`📋 Assigning role: User ${userId} → ${roleName}`);

      // ✅ CRITICAL: Check if THIS SPECIFIC role already exists for this user
      const existingRole = await client.query(
        `SELECT id, is_active 
         FROM votteryy_user_roles 
         WHERE user_id = $1 AND role_name = $2`,
        [userId, roleName]
      );

      let result;

      if (existingRole.rows.length > 0) {
        // ✅ Role exists - UPDATE only this specific role (reactivate if inactive)
        logger.info(`🔄 Role "${roleName}" exists for user ${userId}, updating...`);
        
        result = await client.query(
          `UPDATE votteryy_user_roles 
           SET 
             is_active = true,
             assigned_by = $3,
             assignment_type = $4,
             assignment_source = $5,
             expires_at = $6,
             metadata = $7,
             assigned_at = CURRENT_TIMESTAMP,
             deactivated_at = NULL,
             deactivated_by = NULL,
             deactivation_reason = NULL
           WHERE user_id = $1 AND role_name = $2
           RETURNING *`,
          [userId, roleName, assigned_by, assignment_type, assignment_source, expires_at, metadata]
        );
        
        logger.info(`✅ Updated existing role: ${roleName}`);
      } else {
        // ✅ Role doesn't exist - INSERT as NEW role (keeps all other roles untouched)
        logger.info(`➕ Creating NEW role "${roleName}" for user ${userId}...`);
        
        result = await client.query(
          `INSERT INTO votteryy_user_roles 
           (user_id, role_name, is_active, assigned_by, assignment_type, assignment_source, expires_at, metadata)
           VALUES ($1, $2, true, $3, $4, $5, $6, $7)
           RETURNING *`,
          [userId, roleName, assigned_by, assignment_type, assignment_source, expires_at, metadata]
        );
        
        logger.info(`✅ Created NEW role: ${roleName}`);
      }

      // ✅ Log all active roles for this user after assignment
      const allActiveRoles = await client.query(
        `SELECT role_name 
         FROM votteryy_user_roles 
         WHERE user_id = $1 AND is_active = true
         ORDER BY role_name`,
        [userId]
      );
      
      const activeRoleNames = allActiveRoles.rows.map(r => r.role_name).join(', ');
      logger.info(`📊 User ${userId} now has ${allActiveRoles.rows.length} active roles: [${activeRoleNames}]`);

      await client.query('COMMIT');

      // Invalidate cache
      await roleModel.invalidateUserCache(userId);

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Error assigning role:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Deactivate role assignment (soft delete - sets is_active = false)
  async deactivateRoleAssignment(userId, roleName, deactivatedBy, reason) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE votteryy_user_roles
        SET 
          is_active = false,
          deactivated_at = CURRENT_TIMESTAMP,
          deactivated_by = $3,
          deactivation_reason = $4
        WHERE user_id = $1 AND role_name = $2 AND is_active = true
        RETURNING *`,
        [userId, roleName, deactivatedBy, reason]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query('COMMIT');

      // Invalidate cache
      await roleModel.invalidateUserCache(userId);

      logger.info(`🔴 Role deactivated: User ${userId} → ${roleName}`);
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deactivating role assignment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ DELETE role assignment completely (hard delete - removes from database)

  // ✅ DELETE role assignment completely (with Voter protection)
async deleteRoleAssignment(userId, roleName) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ✅ CRITICAL: Prevent deletion of Voter role
    if (roleName.toLowerCase() === 'voter') {
      throw new Error('Cannot delete Voter role - it is the base role for all users');
    }

    // ✅ Check if user has other roles
    const userRoles = await client.query(
      `SELECT role_name, is_active 
       FROM votteryy_user_roles 
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    const activeRoles = userRoles.rows.filter(r => r.is_active);
    
    // ✅ If this is the ONLY role and it's Voter, prevent deletion
    if (activeRoles.length === 1 && activeRoles[0].role_name.toLowerCase() === 'voter') {
      throw new Error('Cannot delete the only role. Users must have at least the Voter role.');
    }

    // ✅ Proceed with deletion
    const result = await client.query(
      `DELETE FROM votteryy_user_roles
      WHERE user_id = $1 AND role_name = $2
      RETURNING *`,
      [userId, roleName]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('COMMIT');

    // Invalidate cache
    await roleModel.invalidateUserCache(userId);

    logger.info(`🗑️ Role DELETED permanently: User ${userId} → ${roleName}`);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting role assignment:', error);
    throw error;
  } finally {
    client.release();
  }
}
  // async deleteRoleAssignment(userId, roleName) {
  //   const client = await pool.connect();
  //   try {
  //     await client.query('BEGIN');

  //     const result = await client.query(
  //       `DELETE FROM votteryy_user_roles
  //       WHERE user_id = $1 AND role_name = $2
  //       RETURNING *`,
  //       [userId, roleName]
  //     );

  //     if (result.rows.length === 0) {
  //       await client.query('ROLLBACK');
  //       return null;
  //     }

  //     await client.query('COMMIT');

  //     // Invalidate cache
  //     await roleModel.invalidateUserCache(userId);

  //     logger.info(`🗑️ Role DELETED permanently: User ${userId} → ${roleName}`);
  //     return result.rows[0];
  //   } catch (error) {
  //     await client.query('ROLLBACK');
  //     logger.error('Error deleting role assignment:', error);
  //     throw error;
  //   } finally {
  //     client.release();
  //   }
  // }

  // Get user's role assignment history
  async getUserRoleHistory(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          ur.id as assignment_id,
          ur.user_id,
          ur.role_name,
          ur.is_active,
          ur.assigned_at,
          ur.assigned_by,
          ur.assignment_type,
          ur.assignment_source,
          ur.expires_at,
          ur.deactivated_at,
          ur.deactivated_by,
          ur.deactivation_reason,
          r.role_id,
          r.role_type,
          r.role_category,
          assigner.user_email as assigned_by_email,
          deactivator.user_email as deactivated_by_email
        FROM votteryy_user_roles ur
        LEFT JOIN votteryy_roles r ON ur.role_name = r.role_name
        LEFT JOIN public.users assigner ON ur.assigned_by = assigner.user_id
        LEFT JOIN public.users deactivator ON ur.deactivated_by = deactivator.user_id
        WHERE ur.user_id = $1
      `;
      const params = [userId];
      let paramCount = 2;

      if (filters.is_active !== undefined) {
        query += ` AND ur.is_active = $${paramCount}`;
        params.push(filters.is_active);
        paramCount++;
      }

      if (filters.role_name) {
        query += ` AND ur.role_name = $${paramCount}`;
        params.push(filters.role_name);
        paramCount++;
      }

      query += ` ORDER BY ur.assigned_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching user role history:', error);
      throw error;
    }
  }

  // Reactivate role assignment
  async reactivateRoleAssignment(userId, roleName, reactivatedBy) {
    try {
      const result = await pool.query(
        `UPDATE votteryy_user_roles
        SET 
          is_active = true,
          assigned_by = $3,
          assigned_at = CURRENT_TIMESTAMP,
          deactivated_at = NULL,
          deactivated_by = NULL,
          deactivation_reason = NULL
        WHERE user_id = $1 AND role_name = $2 AND is_active = false
        RETURNING *`,
        [userId, roleName, reactivatedBy]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Invalidate cache
      await roleModel.invalidateUserCache(userId);

      logger.info(`🟢 Role reactivated: User ${userId} → ${roleName}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error reactivating role assignment:', error);
      throw error;
    }
  }

  // Check and expire roles (for scheduled jobs)
  async expireRoles() {
    try {
      const result = await pool.query(
        `UPDATE votteryy_user_roles
        SET 
          is_active = false,
          deactivated_at = CURRENT_TIMESTAMP,
          deactivation_reason = 'Automatic expiration'
        WHERE expires_at IS NOT NULL 
          AND expires_at <= CURRENT_TIMESTAMP 
          AND is_active = true
        RETURNING *`
      );

      if (result.rows.length > 0) {
        logger.info(`⏰ Expired ${result.rows.length} role assignments`);
        
        // Invalidate cache for all affected users
        for (const row of result.rows) {
          await roleModel.invalidateUserCache(row.user_id);
        }
      }

      return result.rows;
    } catch (error) {
      logger.error('Error expiring roles:', error);
      throw error;
    }
  }
}

export default new AssignmentModel();