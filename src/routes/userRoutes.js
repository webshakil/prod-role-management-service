import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Search users by email, phone, or name
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 3) {
      return res.status(200).json({
        success: true,
        message: 'Search term must be at least 3 characters',
        data: [],
      });
    }

    const searchTerm = `%${q}%`;
    
    // ✅ FIXED: Match your actual database column names
    const result = await pool.query(
      `SELECT 
        user_id, 
        user_email, 
        user_phone,
        user_name,
        user_firstname,
        user_lastname
      FROM public.users 
      WHERE 
        user_email ILIKE $1 OR 
        user_phone ILIKE $1 OR
        user_name ILIKE $1 OR
        user_firstname ILIKE $1 OR
        user_lastname ILIKE $1
      ORDER BY user_email
      LIMIT 20`,
      [searchTerm]
    );

    return res.status(200).json({
      success: true,
      message: 'Users found',
      data: result.rows,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search users',
      data: [],
    });
  }
});

export default router;