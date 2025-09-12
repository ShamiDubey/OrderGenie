import { Request, Response, NextFunction } from 'express';
import { Employee } from '@prisma/client';
import { employeeSessionService } from '../services/employee-session.service';

export interface EmployeeRequest extends Request {
  employee: Omit<Employee, 'pin'>;
  employeeId: string;
}

/**
 * Employee authentication middleware
 * Checks for x-employee-token header
 */
export const employeeAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-employee-token'];

  if (!token || typeof token !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'Employee authentication required',
    });
  }

  const employee = employeeSessionService.validateSession(token);

  if (!employee) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session',
    });
  }

  // Check if employee is still active
  if (!employee.isActive) {
    employeeSessionService.deleteSession(token);
    return res.status(403).json({
      success: false,
      error: 'Employee account is deactivated',
    });
  }

  // Attach employee data to request
  (req as EmployeeRequest).employee = employee;
  (req as EmployeeRequest).employeeId = employee.id;

  next();
};
