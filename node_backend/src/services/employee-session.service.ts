import { Employee } from '@prisma/client';
import crypto from 'crypto';

interface SessionData {
  employeeId: string;
  employee: Omit<Employee, 'pin'>;
  expiresAt: Date;
}

class EmployeeSessionService {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_DURATION_HOURS = 8; // 8-hour shift duration

  /**
   * Create a new session for an employee
   * @returns session token
   */
  createSession(employee: Employee): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.SESSION_DURATION_HOURS);

    // Remove pin from stored employee data
    const { pin, ...employeeData } = employee;

    this.sessions.set(token, {
      employeeId: employee.id,
      employee: employeeData,
      expiresAt,
    });

    // Clean up expired sessions periodically
    this.cleanupExpiredSessions();

    return token;
  }

  /**
   * Validate a session token and return employee data if valid
   */
  validateSession(token: string): Omit<Employee, 'pin'> | null {
    const session = this.sessions.get(token);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session.employee;
  }

  /**
   * Delete a session (logout)
   */
  deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  /**
   * Get session data by token
   */
  getSession(token: string): SessionData | null {
    const session = this.sessions.get(token);

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        this.sessions.delete(token);
      }
      return null;
    }

    return session;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }

  /**
   * Get all active sessions (for debugging/admin)
   */
  getActiveSessions(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }
}

// Export singleton instance
export const employeeSessionService = new EmployeeSessionService();
