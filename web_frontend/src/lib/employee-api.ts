import {
  ApiResponse,
  Employee,
  EmployeeFormData,
  EmployeeLoginResponse,
  CustomerDetailsForEmployee,
  CommunicationSuggestions,
  FaceRecognitionMatch,
  Order,
  OrderStatus,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '123';

// Session expiry callback - will be set by EmployeeContext
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredCallback(callback: () => void) {
  onSessionExpired = callback;
}

// Helper function for API calls
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    const data = await response.json();

    // Check for session expiry
    if (!data.success && data.error &&
        (data.error.toLowerCase().includes('expired') ||
         data.error.toLowerCase().includes('invalid session') ||
         data.error.toLowerCase().includes('invalid or expired'))) {
      // Clear session and notify
      clearEmployeeSession();
      if (onSessionExpired) {
        onSessionExpired();
      }
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Admin headers
function adminHeaders(): HeadersInit {
  return {
    'x-admin-token': ADMIN_TOKEN,
  };
}

// Employee token storage
const EMPLOYEE_TOKEN_KEY = 'employee_token';
const EMPLOYEE_DATA_KEY = 'employee_data';

export function getStoredEmployeeToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(EMPLOYEE_TOKEN_KEY);
}

export function getStoredEmployee(): Employee | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(EMPLOYEE_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

export function storeEmployeeSession(token: string, employee: Employee): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EMPLOYEE_TOKEN_KEY, token);
  localStorage.setItem(EMPLOYEE_DATA_KEY, JSON.stringify(employee));
}

export function clearEmployeeSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(EMPLOYEE_TOKEN_KEY);
  localStorage.removeItem(EMPLOYEE_DATA_KEY);
}

function employeeHeaders(): HeadersInit {
  const token = getStoredEmployeeToken();
  return token ? { 'x-employee-token': token } : {};
}

// ============================================
// ADMIN CRUD OPERATIONS
// ============================================

export async function createEmployee(data: EmployeeFormData): Promise<ApiResponse<Employee>> {
  const formData = new FormData();

  formData.append('employeeId', data.employeeId);
  formData.append('name', data.name);
  formData.append('pin', data.pin);
  if (data.dateOfBirth) formData.append('dateOfBirth', data.dateOfBirth);
  if (data.gender) formData.append('gender', data.gender);
  if (data.image) formData.append('image', data.image);

  return fetchApi<Employee>('/employees', {
    method: 'POST',
    headers: adminHeaders(),
    body: formData,
  });
}

export async function getEmployees(includeInactive = false): Promise<ApiResponse<Employee[]>> {
  return fetchApi<Employee[]>(`/employees?includeInactive=${includeInactive}`, {
    headers: adminHeaders(),
  });
}

export async function getEmployeeById(id: string): Promise<ApiResponse<Employee>> {
  return fetchApi<Employee>(`/employees/${id}`, {
    headers: adminHeaders(),
  });
}

// Alias for convenience
export const getEmployee = getEmployeeById;

export async function updateEmployee(
  id: string,
  data: Partial<EmployeeFormData> & { isActive?: boolean }
): Promise<ApiResponse<Employee>> {
  const formData = new FormData();

  if (data.employeeId !== undefined) formData.append('employeeId', data.employeeId);
  if (data.name !== undefined) formData.append('name', data.name);
  if (data.pin !== undefined) formData.append('pin', data.pin);
  if (data.dateOfBirth !== undefined) formData.append('dateOfBirth', data.dateOfBirth);
  if (data.gender !== undefined) formData.append('gender', data.gender);
  if (data.isActive !== undefined) formData.append('isActive', String(data.isActive));
  if (data.image) formData.append('image', data.image);

  return fetchApi<Employee>(`/employees/${id}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: formData,
  });
}

export async function deleteEmployee(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/employees/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
}

// ============================================
// AUTHENTICATION
// ============================================

export async function employeeLogin(
  employeeId: string,
  pin: string
): Promise<ApiResponse<EmployeeLoginResponse>> {
  const result = await fetchApi<EmployeeLoginResponse>('/employees/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, pin }),
  });

  if (result.success && result.data) {
    storeEmployeeSession(result.data.token, result.data.employee);
  }

  return result;
}

export async function employeeLogout(): Promise<ApiResponse<{ message: string }>> {
  const result = await fetchApi<{ message: string }>('/employees/logout', {
    method: 'POST',
    headers: employeeHeaders(),
  });

  clearEmployeeSession();
  return result;
}

export async function getEmployeeMe(): Promise<ApiResponse<Employee>> {
  return fetchApi<Employee>('/employees/me', {
    headers: employeeHeaders(),
  });
}

// ============================================
// EMPLOYEE MODE - CUSTOMER OPERATIONS
// ============================================

export async function searchCustomers(query: string): Promise<ApiResponse<Array<{
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  createdAt: string;
  _count: { orders: number };
}>>> {
  return fetchApi(`/employees/mode/customers/search?q=${encodeURIComponent(query)}`, {
    headers: employeeHeaders(),
  });
}

export async function getCustomerDetails(profileId: string): Promise<ApiResponse<CustomerDetailsForEmployee>> {
  return fetchApi<CustomerDetailsForEmployee>(`/employees/mode/customer/${profileId}`, {
    headers: employeeHeaders(),
  });
}

export async function getCommunicationSuggestions(
  profileId: string
): Promise<ApiResponse<CommunicationSuggestions>> {
  return fetchApi<CommunicationSuggestions>(`/employees/mode/customer/${profileId}/communication`, {
    headers: employeeHeaders(),
  });
}

/**
 * Refresh AI insights for a customer
 * Regenerates AI insight, greetings, and communication suggestions
 */
export async function refreshCustomerInsights(profileId: string): Promise<ApiResponse<{
  aiInsight: string | null;
  insightMetadata: Record<string, unknown> | null;
  insightUpdatedAt: string | null;
}>> {
  return fetchApi(`/employees/mode/customer/${profileId}/refresh-insights`, {
    method: 'POST',
    headers: employeeHeaders(),
  });
}

// ============================================
// FACE RECOGNITION (reuses existing endpoint)
// ============================================

export async function recognizeFace(image: File): Promise<ApiResponse<{
  matches: FaceRecognitionMatch[];
  processingTimeMs: number;
}>> {
  const formData = new FormData();
  formData.append('image', image);

  return fetchApi('/face/recognize', {
    method: 'POST',
    body: formData,
  });
}

// ============================================
// EMPLOYEE MODE - ORDER MANAGEMENT
// ============================================

/**
 * Get active orders for Kanban board
 * Returns orders with status: PENDING, CONFIRMED, PREPARING, READY
 */
export async function getActiveOrders(): Promise<ApiResponse<Order[]>> {
  return fetchApi<Order[]>('/employees/mode/orders', {
    headers: employeeHeaders(),
  });
}

/**
 * Update order status
 */
export async function updateEmployeeOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/employees/mode/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      ...employeeHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
}
