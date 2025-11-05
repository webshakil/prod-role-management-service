import assignmentModel from '../models/assignmentModel.js';
import roleModel from '../models/roleModel.js';
import { successResponse, errorResponse } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// Get all role assignments
export const getRoleAssignments = async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      role_name: req.query.role_name,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      assignment_type: req.query.assignment_type,
      assignment_source: req.query.assignment_source,
    };

    const assignments = await assignmentModel.getRoleAssignments(filters);

    // ✅ CRITICAL: Return the array directly, not wrapped
    return res.status(200).json({
      success: true,
      message: 'Role assignments retrieved successfully',
      data: assignments, // ← This should be an array
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get role assignments error:', error);
    return errorResponse(res, 'Failed to retrieve role assignments', 500);
  }
};

// Assign role to user
// export const assignRole = async (req, res) => {
//   try {
//     const { user_id, role_name, assignment_type, expires_at, metadata } = req.body;
//     const assigned_by = req.headers['x-user-id'];

//     if (!user_id || !role_name) {
//       return errorResponse(res, 'User ID and role name are required', 400);
//     }

//     // Verify role exists
//     const role = await roleModel.getRoleByName(role_name);
//     if (!role) {
//       return errorResponse(res, `Role "${role_name}" not found`, 404);
//     }

//     // Assign role
//     const assignment = await assignmentModel.assignRole(user_id, role_name, {
//       assigned_by,
//       assignment_type: assignment_type || 'manual',
//       assignment_source: 'role_service',
//       expires_at,
//       metadata,
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Role assigned successfully',
//       data: assignment,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     logger.error('Assign role error:', error);
//     return errorResponse(res, 'Failed to assign role', 500);
//   }
// };

// Assign role to user
export const assignRole = async (req, res) => {
  console.log('\n🎯 ========== ASSIGNMENT CONTROLLER ==========');
  console.log('📥 req.body:', req.body);
  console.log('📥 req.headers:', req.headers);
  console.log('📥 req.method:', req.method);
  console.log('📥 req.url:', req.url);
  console.log('🎯 ==========================================\n');
  try {
    console.log('📥 Request body:', req.body);
    console.log('📥 Request headers x-user-id:', req.headers['x-user-id']);
   
    
    // ✅ Get user_id from body OR header
    let { user_id, role_name, assignment_type, expires_at, metadata } = req.body;
    const assigned_by = req.headers['x-user-id'];

    // ✅ FALLBACK: If user_id not in body, it's the requesting user
    if (!user_id) {
      user_id = assigned_by;
      console.log('⚠️ user_id not in body, using x-user-id:', user_id);
    }

    console.log('📋 Processing assignment:', { 
      user_id, 
      role_name, 
      assignment_type, 
      assigned_by 
    });

    // Validate required fields
    if (!user_id || !role_name) {
      console.error('❌ Missing required fields:', { user_id, role_name });
      return res.status(400).json({
        success: false,
        message: 'User ID and role name are required',
        errors: { user_id, role_name },
        timestamp: new Date().toISOString(),
      });
    }

    // Convert user_id to number if it's a string
    user_id = parseInt(user_id);

    // Verify role exists
    const role = await roleModel.getRoleByName(role_name);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Role "${role_name}" not found`,
        errors: null,
        timestamp: new Date().toISOString(),
      });
    }

    console.log('✅ Role found:', role);

    // Assign role
    const assignment = await assignmentModel.assignRole(user_id, role_name, {
      assigned_by: assigned_by ? parseInt(assigned_by) : null,
      assignment_type: assignment_type || 'manual',
      assignment_source: 'role_service',
      expires_at,
      metadata,
    });

    console.log('✅ Assignment successful:', assignment);

    return res.status(201).json({
      success: true,
      message: 'Role assigned successfully',
      data: assignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Assign role error:', error);
    console.error('❌ Full error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign role',
      errors: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Deactivate role assignment
export const deactivateRoleAssignment = async (req, res) => {
  try {
    const { user_id, role_name } = req.body;
    const { reason } = req.body;
    const deactivated_by = req.headers['x-user-id'];

    if (!user_id || !role_name) {
      return errorResponse(res, 'User ID and role name are required', 400);
    }

    const assignment = await assignmentModel.deactivateRoleAssignment(
      user_id,
      role_name,
      deactivated_by,
      reason || 'Deactivated by admin'
    );

    if (!assignment) {
      return errorResponse(res, 'Active role assignment not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Role assignment deactivated successfully',
      data: assignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Deactivate role assignment error:', error);
    return errorResponse(res, 'Failed to deactivate role assignment', 500);
  }
};

// Get user's role assignment history
export const getUserRoleHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const filters = {
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      role_name: req.query.role_name,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
    };

    const history = await assignmentModel.getUserRoleHistory(userId, filters);

    return res.status(200).json({
      success: true,
      message: 'User role history retrieved successfully',
      data: history, // ← This should be an array
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Get user role history error:', error);
    return errorResponse(res, 'Failed to retrieve user role history', 500);
  }
};

// Delete role assignment completely
export const deleteRoleAssignment = async (req, res) => {
  try {
    const { user_id, role_name } = req.body;
    const deleted_by = req.headers['x-user-id'];

    console.log('🗑️ Delete request:', { user_id, role_name, deleted_by });

    if (!user_id || !role_name) {
      return errorResponse(res, 'User ID and role name are required', 400);
    }

    // ✅ PROTECT: Cannot delete Voter role
    if (role_name.toLowerCase() === 'voter') {
      return errorResponse(res, 'Cannot delete Voter role - it is the base role for all users', 403);
    }

    const assignment = await assignmentModel.deleteRoleAssignment(user_id, role_name);

    if (!assignment) {
      return errorResponse(res, 'Role assignment not found', 404);
    }

    return successResponse(res, 'Role assignment deleted permanently', assignment);
  } catch (error) {
    logger.error('Delete role assignment error:', error);
    
    // ✅ Return user-friendly error message
    return errorResponse(res, error.message || 'Failed to delete role assignment', 500);
  }
};

// export const deleteRoleAssignment = async (req, res) => {
//   try {
//     const { user_id, role_name } = req.body;
//     const deleted_by = req.headers['x-user-id'];

//     console.log('🗑️ Delete request:', { user_id, role_name, deleted_by });

//     if (!user_id || !role_name) {
//       return errorResponse(res, 'User ID and role name are required', 400);
//     }

//     const assignment = await assignmentModel.deleteRoleAssignment(user_id, role_name);

//     if (!assignment) {
//       return errorResponse(res, 'Role assignment not found', 404);
//     }

//     return successResponse(res, 'Role assignment deleted permanently', assignment);
//   } catch (error) {
//     logger.error('Delete role assignment error:', error);
//     return errorResponse(res, 'Failed to delete role assignment', 500);
//   }
// };

// Reactivate role assignment
export const reactivateRoleAssignment = async (req, res) => {
  try {
    const { user_id, role_name } = req.body;
    const reactivated_by = req.headers['x-user-id'];

    if (!user_id || !role_name) {
      return errorResponse(res, 'User ID and role name are required', 400);
    }

    const assignment = await assignmentModel.reactivateRoleAssignment(
      user_id,
      role_name,
      reactivated_by
    );

    if (!assignment) {
      return errorResponse(res, 'Inactive role assignment not found', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Role assignment reactivated successfully',
      data: assignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Reactivate role assignment error:', error);
    return errorResponse(res, 'Failed to reactivate role assignment', 500);
  }
};

export default {
  getRoleAssignments,
  assignRole,
  deactivateRoleAssignment,
  getUserRoleHistory,
  reactivateRoleAssignment,
  deleteRoleAssignment
};