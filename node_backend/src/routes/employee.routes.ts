import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { adminAuth } from '../middleware/admin';
import { employeeAuth } from '../middleware/employee';
import { upload } from '../middleware/upload';

const router = Router();

// ============================================
// ADMIN ROUTES (require admin token)
// ============================================

// Create employee
router.post('/', adminAuth, upload.single('image'), (req, res) =>
  employeeController.create(req, res)
);

// List all employees
router.get('/', adminAuth, (req, res) =>
  employeeController.list(req, res)
);

// Get employee by ID
router.get('/:id', adminAuth, (req, res) =>
  employeeController.getById(req, res)
);

// Update employee
router.put('/:id', adminAuth, upload.single('image'), (req, res) =>
  employeeController.update(req, res)
);

// Delete/deactivate employee
router.delete('/:id', adminAuth, (req, res) =>
  employeeController.delete(req, res)
);

// ============================================
// PUBLIC ROUTES
// ============================================

// Employee login
router.post('/login', (req, res) =>
  employeeController.login(req, res)
);

// ============================================
// AUTHENTICATED EMPLOYEE ROUTES
// ============================================

// Employee logout
router.post('/logout', employeeAuth, (req, res) =>
  employeeController.logout(req, res)
);

// Get current employee info
router.get('/me', employeeAuth, (req, res) =>
  employeeController.me(req, res)
);

// ============================================
// EMPLOYEE MODE ROUTES (require employee auth)
// ============================================

// Search customers by name/email
router.get('/mode/customers/search', employeeAuth, (req, res) =>
  employeeController.searchCustomers(req, res)
);

// Get customer details
router.get('/mode/customer/:profileId', employeeAuth, (req, res) =>
  employeeController.getCustomerDetails(req, res)
);

// Get AI communication suggestions for customer
router.get('/mode/customer/:profileId/communication', employeeAuth, (req, res) =>
  employeeController.getCommunicationSuggestions(req, res)
);

// Refresh AI insights for a customer
router.post('/mode/customer/:profileId/refresh-insights', employeeAuth, (req, res) =>
  employeeController.refreshCustomerInsights(req, res)
);

// ============================================
// EMPLOYEE MODE - ORDER MANAGEMENT
// ============================================

// Get active orders for Kanban board
router.get('/mode/orders', employeeAuth, (req, res) =>
  employeeController.getActiveOrders(req, res)
);

// Update order status
router.patch('/mode/orders/:id/status', employeeAuth, (req, res) =>
  employeeController.updateOrderStatus(req, res)
);

export default router;
