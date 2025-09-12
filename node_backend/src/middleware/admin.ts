import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface AdminRequest extends Request {
  isAdmin: boolean;
}

/**
 * Admin authentication middleware
 * Checks for x-admin-token header or Bearer token
 */
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const adminTokenHeader = req.headers['x-admin-token'];

  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (typeof adminTokenHeader === 'string') {
    token = adminTokenHeader;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required',
    });
  }

  if (token !== config.adminToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid admin token',
    });
  }

  (req as AdminRequest).isAdmin = true;
  next();
};
