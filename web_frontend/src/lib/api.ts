import {
  ApiResponse,
  Category,
  Product,
  FaceProfile,
  FaceMatch,
  FaceDetectionResult,
  ProductFormData,
  CategoryFormData,
  Order,
  CreateOrderData,
  PointsBalance,
  PointsHistoryResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const PYTHON_API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '123';

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
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Admin helper
function adminHeaders(): HeadersInit {
  return {
    'x-admin-token': ADMIN_TOKEN,
  };
}

// ============ PRODUCT APIs ============

export async function getProducts(params?: {
  category?: string;
  isVeg?: boolean;
  tags?: string;
  search?: string;
  featured?: boolean;
  available?: string | boolean; // 'all' to include unavailable products (for admin)
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Product[]>> {
  const searchParams = new URLSearchParams();

  if (params?.category) searchParams.set('category', params.category);
  if (params?.isVeg !== undefined) searchParams.set('isVeg', String(params.isVeg));
  if (params?.tags) searchParams.set('tags', params.tags);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.featured !== undefined) searchParams.set('featured', String(params.featured));
  if (params?.available !== undefined) searchParams.set('available', String(params.available));
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  return fetchApi<Product[]>(`/products${query ? `?${query}` : ''}`);
}

export async function getFeaturedProducts(limit?: number): Promise<ApiResponse<Product[]>> {
  const query = limit ? `?limit=${limit}` : '';
  return fetchApi<Product[]>(`/products/featured${query}`);
}

export async function getProductById(id: string): Promise<ApiResponse<Product>> {
  return fetchApi<Product>(`/products/${id}`);
}

export async function getProductBySlug(slug: string): Promise<ApiResponse<Product>> {
  return fetchApi<Product>(`/products/slug/${slug}`);
}

export async function createProduct(data: ProductFormData): Promise<ApiResponse<Product>> {
  const formData = new FormData();

  formData.append('name', data.name);
  formData.append('price', String(data.price));

  if (data.description) formData.append('description', data.description);
  if (data.discountedPrice) formData.append('discountedPrice', String(data.discountedPrice));
  if (data.discountEnds) formData.append('discountEnds', data.discountEnds);
  formData.append('isVeg', String(data.isVeg));
  if (data.tags) formData.append('tags', data.tags);
  if (data.categoryId) formData.append('categoryId', data.categoryId);
  if (data.preparationTime) formData.append('preparationTime', String(data.preparationTime));
  if (data.calories) formData.append('calories', String(data.calories));
  if (data.servingSize) formData.append('servingSize', data.servingSize);
  formData.append('isAvailable', String(data.isAvailable));
  formData.append('isFeatured', String(data.isFeatured));
  if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
  if (data.royaltyPoints !== undefined) formData.append('royaltyPoints', String(data.royaltyPoints));
  if (data.image) formData.append('image', data.image);

  return fetchApi<Product>('/products', {
    method: 'POST',
    headers: adminHeaders(),
    body: formData,
  });
}

export async function updateProduct(
  id: string,
  data: Partial<ProductFormData>
): Promise<ApiResponse<Product>> {
  const formData = new FormData();

  if (data.name) formData.append('name', data.name);
  if (data.price !== undefined) formData.append('price', String(data.price));
  if (data.description !== undefined) formData.append('description', data.description || '');
  if (data.discountedPrice !== undefined) formData.append('discountedPrice', String(data.discountedPrice || ''));
  if (data.discountEnds !== undefined) formData.append('discountEnds', data.discountEnds || '');
  if (data.isVeg !== undefined) formData.append('isVeg', String(data.isVeg));
  if (data.tags !== undefined) formData.append('tags', data.tags || '');
  if (data.categoryId !== undefined) formData.append('categoryId', data.categoryId || '');
  if (data.preparationTime !== undefined) formData.append('preparationTime', String(data.preparationTime || ''));
  if (data.calories !== undefined) formData.append('calories', String(data.calories || ''));
  if (data.servingSize !== undefined) formData.append('servingSize', data.servingSize || '');
  if (data.isAvailable !== undefined) formData.append('isAvailable', String(data.isAvailable));
  if (data.isFeatured !== undefined) formData.append('isFeatured', String(data.isFeatured));
  if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
  if (data.royaltyPoints !== undefined) formData.append('royaltyPoints', String(data.royaltyPoints));
  if (data.image) formData.append('image', data.image);

  return fetchApi<Product>(`/products/${id}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: formData,
  });
}

export async function toggleProductAvailability(
  id: string,
  isAvailable: boolean
): Promise<ApiResponse<{ id: string; isAvailable: boolean }>> {
  return fetchApi<{ id: string; isAvailable: boolean }>(`/products/${id}/availability`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isAvailable }),
  });
}

export async function deleteProduct(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/products/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
}

// ============ CATEGORY APIs ============

export async function getCategories(): Promise<ApiResponse<Category[]>> {
  return fetchApi<Category[]>('/categories');
}

export async function getCategoryById(id: string): Promise<ApiResponse<Category>> {
  return fetchApi<Category>(`/categories/${id}`);
}

export async function getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
  return fetchApi<Category>(`/categories/slug/${slug}`);
}

export async function getCategoryProducts(id: string): Promise<ApiResponse<Product[]>> {
  return fetchApi<Product[]>(`/categories/${id}/products`);
}

export async function getCategoryProductsBySlug(slug: string): Promise<ApiResponse<Product[]>> {
  return fetchApi<Product[]>(`/categories/slug/${slug}/products`);
}

export async function createCategory(data: CategoryFormData): Promise<ApiResponse<Category>> {
  const formData = new FormData();

  formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
  if (data.isActive !== undefined) formData.append('isActive', String(data.isActive));
  if (data.modifiers && data.modifiers.length > 0) {
    formData.append('modifiers', JSON.stringify(data.modifiers));
  }
  if (data.image) formData.append('image', data.image);

  return fetchApi<Category>('/categories', {
    method: 'POST',
    headers: adminHeaders(),
    body: formData,
  });
}

export async function updateCategory(
  id: string,
  data: Partial<CategoryFormData>
): Promise<ApiResponse<Category>> {
  const formData = new FormData();

  if (data.name) formData.append('name', data.name);
  if (data.description !== undefined) formData.append('description', data.description || '');
  if (data.displayOrder !== undefined) formData.append('displayOrder', String(data.displayOrder));
  if (data.isActive !== undefined) formData.append('isActive', String(data.isActive));
  if (data.modifiers !== undefined) {
    formData.append('modifiers', JSON.stringify(data.modifiers || []));
  }
  if (data.image) formData.append('image', data.image);

  return fetchApi<Category>(`/categories/${id}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: formData,
  });
}

export async function deleteCategory(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/categories/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
}

// ============ FACE RECOGNITION APIs ============

export async function registerFace(
  name: string,
  email: string,
  image: File,
  createdBy?: string
): Promise<ApiResponse<{ profile: FaceProfile; embedding: { id: string; confidence: number | null; modelName: string }; processingTimeMs: number }>> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('email', email);
  formData.append('image', image);
  if (createdBy) {
    formData.append('createdBy', createdBy);
  }

  return fetchApi<{ profile: FaceProfile; embedding: { id: string; confidence: number | null; modelName: string }; processingTimeMs: number }>('/profiles/register', {
    method: 'POST',
    body: formData,
  });
}

export async function recognizeFace(image: File): Promise<ApiResponse<FaceMatch[]>> {
  const formData = new FormData();
  formData.append('image', image);

  return fetchApi<FaceMatch[]>('/face/recognize', {
    method: 'POST',
    body: formData,
  });
}

export async function detectFaces(image: File): Promise<ApiResponse<FaceDetectionResult>> {
  const formData = new FormData();
  formData.append('image', image);

  return fetchApi<FaceDetectionResult>('/face/detect', {
    method: 'POST',
    body: formData,
  });
}

export async function getProfiles(): Promise<ApiResponse<FaceProfile[]>> {
  return fetchApi<FaceProfile[]>('/profiles');
}

export async function getProfileById(id: string): Promise<ApiResponse<FaceProfile>> {
  return fetchApi<FaceProfile>(`/profiles/${id}`);
}

export async function deleteProfile(id: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>(`/profiles/${id}`, {
    method: 'DELETE',
  });
}

export async function checkUsernameAvailable(username: string, excludeId?: string): Promise<ApiResponse<{ available: boolean }>> {
  const params = excludeId ? `?excludeId=${excludeId}` : '';
  return fetchApi<{ available: boolean }>(`/profiles/check-username/${encodeURIComponent(username)}${params}`);
}

export async function updateProfile(
  id: string,
  data: {
    name?: string;
    username?: string;
    phone?: string;
    password?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressPincode?: string;
    addressLandmark?: string;
    dietaryPreference?: string;
    hideNonVeg?: boolean;
    religion?: string;
    avatar?: File;
  }
): Promise<ApiResponse<FaceProfile>> {
  const formData = new FormData();

  if (data.name !== undefined) formData.append('name', data.name);
  if (data.username !== undefined) formData.append('username', data.username);
  if (data.phone !== undefined) formData.append('phone', data.phone);
  if (data.password !== undefined) formData.append('password', data.password);
  if (data.addressStreet !== undefined) formData.append('addressStreet', data.addressStreet);
  if (data.addressCity !== undefined) formData.append('addressCity', data.addressCity);
  if (data.addressState !== undefined) formData.append('addressState', data.addressState);
  if (data.addressPincode !== undefined) formData.append('addressPincode', data.addressPincode);
  if (data.addressLandmark !== undefined) formData.append('addressLandmark', data.addressLandmark);
  if (data.dietaryPreference !== undefined) formData.append('dietaryPreference', data.dietaryPreference);
  if (data.hideNonVeg !== undefined) formData.append('hideNonVeg', String(data.hideNonVeg));
  if (data.religion !== undefined) formData.append('religion', data.religion);
  if (data.avatar) formData.append('avatar', data.avatar);

  return fetchApi<FaceProfile>(`/profiles/${id}`, {
    method: 'PUT',
    body: formData,
  });
}

export async function removeProfileAvatar(id: string): Promise<ApiResponse<FaceProfile>> {
  return fetchApi<FaceProfile>(`/profiles/${id}/avatar`, {
    method: 'DELETE',
  });
}

// Login with username/password (for kiosk)
export async function loginProfile(
  username: string,
  password: string
): Promise<ApiResponse<FaceProfile>> {
  return fetchApi<FaceProfile>('/profiles/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
}

// ============ HEALTH CHECK ============

export async function healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
  return fetchApi<{ status: string; timestamp: string }>('/health');
}

// ============ ORDER APIs ============

export async function createOrder(data: CreateOrderData): Promise<ApiResponse<Order>> {
  return fetchApi<Order>('/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function getOrderById(id: string): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/orders/${id}`);
}

export async function getOrderByNumber(orderNumber: string): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/orders/number/${orderNumber}`);
}

export async function getOrdersByProfile(profileId: string): Promise<ApiResponse<Order[]>> {
  return fetchApi<Order[]>(`/orders/profile/${profileId}`);
}

export async function cancelOrder(id: string): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/orders/${id}/cancel`, {
    method: 'PATCH',
  });
}

// ============ ADMIN ORDER APIs ============

export async function getAdminOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<Order[]>> {
  const searchParams = new URLSearchParams();

  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  return fetchApi<Order[]>(`/orders${query ? `?${query}` : ''}`, {
    headers: adminHeaders(),
  });
}

export async function updateOrderStatus(
  id: string,
  status: string
): Promise<ApiResponse<Order>> {
  return fetchApi<Order>(`/orders/${id}/status`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
}

// ============ RECOMMENDATION APIs ============

export interface RecommendationProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discounted_price: number | null;
  discount_ends: string | null;
  is_veg: boolean;
  tags: string[];
  image_url: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  is_available: boolean;
  is_featured: boolean;
  preparation_time: number | null;
  calories: number | null;
  serving_size: string | null;
  royalty_points?: number;
}

export interface RecommendationWithReason {
  product: RecommendationProduct;
  score: number;
  reason: string;
  reasonType: 'preference' | 'history' | 'trending' | 'similar';
}

export interface PersonalizedRecommendationResponse {
  recommendations: RecommendationWithReason[];
  insights?: string;
  preferences?: {
    vegPreference?: number;
    priceRange?: string;
    preferredCategories?: string[];
  };
  source?: string;
}

export interface TrendingResponse {
  products: RecommendationProduct[];
  source?: string;
}

export interface SimilarProductsResponse {
  products: RecommendationProduct[];
  source?: string;
}

export async function getPersonalizedRecommendations(
  profileId: string,
  context: string = 'homepage',
  limit: number = 10
): Promise<ApiResponse<PersonalizedRecommendationResponse>> {
  return fetchApi<PersonalizedRecommendationResponse>(
    `/recommendations/profile/${profileId}?limit=${limit}&context=${context}`
  );
}

export async function getTrendingProducts(limit: number = 10): Promise<ApiResponse<TrendingResponse>> {
  return fetchApi<TrendingResponse>(`/recommendations/trending?limit=${limit}`);
}

export async function getSimilarProducts(
  productId: string,
  limit: number = 5
): Promise<ApiResponse<SimilarProductsResponse>> {
  return fetchApi<SimilarProductsResponse>(`/recommendations/product/${productId}/similar?limit=${limit}`);
}

// ============ ADMIN RECOMMENDATION APIs ============

export interface AdminRecommendationStats {
  users: {
    total: number;
    withPreferences: number;
    withoutPreferences: number;
  };
  cache: {
    total: number;
    expired: number;
    active: number;
  };
  trending: {
    lastComputed: string;
    expiresAt: string;
    isExpired: boolean;
    productCount: number;
  } | null;
}

export interface AdminUserPreference {
  vegPreference: number;
  priceRange: string;
  totalOrders: number;
  lastOrderAt: string | null;
  avgOrderValue: string;
}

export interface AdminUserCacheStatus {
  hasCache: boolean;
  isExpired: boolean;
  expiresAt?: string;
  createdAt?: string;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  hasPreferences: boolean;
  preferences: AdminUserPreference | null;
  cacheStatus: AdminUserCacheStatus;
}

export interface AdminUserDetail {
  profile: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
  preferences: {
    vegPreference: number;
    priceRange: string;
    avgOrderValue: string;
    categoryAffinities: Record<string, number>;
    tagAffinities: Record<string, number>;
    favoriteProducts: string[];
    totalOrders: number;
    lastOrderAt: string | null;
  } | null;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    grandTotal: string;
    status: string;
    createdAt: string;
    itemCount: number;
    items: Array<{
      productName: string;
      quantity: number;
      isVeg: boolean;
    }>;
  }>;
  recommendations: PersonalizedRecommendationResponse | null;
  cacheInfo: {
    createdAt: string;
    expiresAt: string;
    isExpired: boolean;
    aiInsights: string | null;
  } | null;
}

export async function getAdminRecommendationStats(): Promise<ApiResponse<AdminRecommendationStats>> {
  return fetchApi<AdminRecommendationStats>('/recommendations/admin/stats', {
    headers: adminHeaders(),
  });
}

export async function getAdminRecommendationUsers(
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<AdminUserSummary[]>> {
  return fetchApi<AdminUserSummary[]>(`/recommendations/admin/users?page=${page}&limit=${limit}`, {
    headers: adminHeaders(),
  });
}

export async function getAdminUserRecommendations(profileId: string): Promise<ApiResponse<AdminUserDetail>> {
  return fetchApi<AdminUserDetail>(`/recommendations/admin/user/${profileId}`, {
    headers: adminHeaders(),
  });
}

export async function refreshUserRecommendations(profileId?: string): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>('/recommendations/refresh', {
    method: 'POST',
    headers: {
      ...adminHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profileId }),
  });
}

export async function cleanupRecommendationCache(): Promise<ApiResponse<{ message: string }>> {
  return fetchApi<{ message: string }>('/recommendations/cleanup', {
    method: 'POST',
    headers: adminHeaders(),
  });
}

// ============ POINTS APIs ============

export async function getPointsBalance(profileId: string): Promise<ApiResponse<PointsBalance>> {
  return fetchApi<PointsBalance>(`/points/profile/${profileId}`);
}

export async function getPointsHistory(
  profileId: string,
  page: number = 1,
  limit: number = 20
): Promise<ApiResponse<PointsHistoryResponse>> {
  return fetchApi<PointsHistoryResponse>(`/points/profile/${profileId}/history?page=${page}&limit=${limit}`);
}

// ============ CHAT APIs ============

export interface ChatProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discounted_price: number | null;
  effective_price: number;
  is_veg: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  has_active_discount: boolean;
  discount_percent: number;
  royalty_points: number;
  preparation_time: number | null;
  calories: number | null;
  is_available: boolean;
  is_featured: boolean;
  tags: string[];
}

export interface ChatMessageRequest {
  message: string;
  profile_id?: string;
  conversation_history: Array<{
    role: string;
    content: string;
  }>;
}

export interface ChatResponse {
  message: string;
  suggested_products: ChatProduct[];
  intent: 'greeting' | 'recommendation' | 'confirmation' | 'clarification' | 'farewell';
  follow_up_prompts: string[];
}

export async function sendChatMessage(
  data: ChatMessageRequest
): Promise<ApiResponse<ChatResponse>> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Chat API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function confirmChatProducts(
  productIds: string[]
): Promise<ApiResponse<{ products: ChatProduct[] }>> {
  try {
    const response = await fetch(`${PYTHON_API_URL}/api/chat/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_ids: productIds }),
    });
    return await response.json();
  } catch (error) {
    console.error('Chat Confirm API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
