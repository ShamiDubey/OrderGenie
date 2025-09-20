// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Category Modifier Types
export interface ModifierOption {
  name: string;
  price: number;  // 0 for free, positive for extra charge
}

export interface CategoryModifier {
  name: string;
  required: boolean;
  multiSelect: boolean;  // true = checkboxes, false = radio buttons
  options: ModifierOption[];
}

// Selected modifier for cart item
export interface SelectedModifier {
  groupName: string;
  options: { name: string; price: number }[];  // Multiple selections allowed
}

// Category Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  modifiers?: CategoryModifier[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

// Product Types
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  discountedPrice: string | null;
  discountEnds: string | null;
  isVeg: boolean;
  tags: string[];
  imageUrl: string | null;
  thumbnailUrl: string | null;
  categoryId: string | null;
  category: CategoryRef | null;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  preparationTime: number | null;
  calories: number | null;
  servingSize: string | null;
  effectivePrice: number | string;
  hasActiveDiscount: boolean;
  royaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

// Dietary preference type
export type DietaryPreference = 'none' | 'vegan' | 'vegetarian' | 'eggetarian' | 'non-vegetarian';

// Religion type for food restrictions
export type Religion = 'hindu' | 'muslim' | 'christian' | 'jain' | 'buddhist' | 'sikh' | 'other' | 'prefer_not_to_say';

// Face Recognition Types
export interface FaceProfile {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  password?: string | null; // For kiosk login (simple, no encryption)
  totalPoints: number;
  avatarUrl?: string | null;
  avatarId?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPincode?: string | null;
  addressLandmark?: string | null;
  dietaryPreference?: DietaryPreference | null;
  hideNonVeg?: boolean;
  religion?: Religion | null;
  createdBy?: string | null; // ADMIN, APP, or EMP_{employeeId}
  createdAt: string;
  updatedAt: string;
  embeddings?: FaceEmbedding[];
}

export interface ProfileUpdateData {
  name?: string;
  username?: string;
  phone?: string;
  password?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPincode?: string;
  addressLandmark?: string;
  dietaryPreference?: DietaryPreference;
  hideNonVeg?: boolean;
  religion?: Religion;
  avatar?: File;
}

export interface FaceEmbedding {
  id: string;
  profileId: string;
  imagePath: string | null;
  confidence: number | null;
  modelName: string;
  createdAt: string;
}

export interface FaceMatch {
  profile: FaceProfile;
  similarity: number;
  distance: number;
  embedding: FaceEmbedding;
}

export interface FaceDetectionResult {
  faceCount: number;
  faces: {
    region: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    confidence: number;
  }[];
}

// Form Types
export interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  discountEnds?: string;
  isVeg: boolean;
  tags?: string;
  categoryId?: string;
  preparationTime?: number;
  calories?: number;
  servingSize?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  displayOrder?: number;
  royaltyPoints?: number;
  image?: File;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  modifiers?: CategoryModifier[];
  image?: File;
}

export interface FaceRegisterFormData {
  name: string;
  email: string;
  image: File;
}

// Order Types
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod =
  | 'PAY_ON_COUNTER'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'UPI'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'UPI_APPS';

export type OrderType = 'DINE_IN' | 'PICKUP' | 'TAKEAWAY';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: string;
  discountedPrice: string | null;
  effectivePrice: string;
  lineTotal: string;
  isVeg: boolean;
  categoryName: string | null;
  royaltyPoints: number;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  profileId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod | null;
  pointsEarned: number | null;
  notes: string | null;
  subtotal: string;
  discountTotal: string;
  taxAmount: string;
  grandTotal: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
}

export interface CreateOrderData {
  profileId?: string;
  employeeId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  orderType?: OrderType;
  paymentMethod?: PaymentMethod;
  items: {
    productId: string;
    quantity: number;
  }[];
}

// Points Types
export interface PointsTransaction {
  id: string;
  profileId: string;
  orderId: string | null;
  points: number;
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTED';
  description: string | null;
  createdAt: string;
  order?: {
    orderNumber: string;
    grandTotal: string;
  } | null;
}

export interface PointsBalance {
  totalPoints: number;
  formatted: string;
}

export interface PointsHistoryResponse {
  transactions: PointsTransaction[];
  pagination: Pagination;
}

// Employee Types
export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  profileImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  _count?: {
    orders: number;
  };
}

export interface EmployeeFormData {
  employeeId: string;
  name: string;
  pin: string;
  dateOfBirth?: string;
  gender?: string;
  image?: File;
}

export interface EmployeeLoginResponse {
  token: string;
  employee: Employee;
}

export interface CommunicationSuggestions {
  openingLines: string[];
  conversationTopics: string[];
  specialNotes: string[];
  upsellSuggestions: Array<{
    productName: string;
    reason: string;
  }>;
}

// Upsell suggestion from AI
export interface UpsellSuggestion {
  productName: string;
  reason: string;
}

// AI Insight Metadata - structured data about customer behavior and communication suggestions
export interface InsightMetadata {
  favoriteItems?: string[];
  favoriteCategories?: string[];
  orderingPattern?: 'frequent' | 'weekly' | 'biweekly' | 'occasional';
  avgVisitFrequency?: number;
  dietaryStyle?: 'vegetarian' | 'non_vegetarian' | 'mixed';
  spendingTier?: 'budget' | 'medium' | 'premium';
  loyaltyStatus?: 'new' | 'regular' | 'loyal' | 'vip';
  lastAnalyzedOrderCount?: number;
  // Communication suggestions (pre-generated and stored with insight)
  greetings?: string[];
  conversationTopics?: string[];
  specialNotes?: string[];
  upsellSuggestions?: UpsellSuggestion[];
}

export interface UserPreference {
  vegPreference: number;
  priceRange: string;
  avgOrderValue: string;
  categoryAffinities: Record<string, number>;
  tagAffinities: Record<string, number>;
  favoriteProducts: string[];
  totalOrders: number;
  lastOrderAt: string | null;
}

export interface CustomerDetailsForEmployee {
  profile: {
    id: string;
    name: string;
    email: string;
    totalPoints: number;
    avatarUrl: string | null;
    createdAt: string;
  };
  preferences: UserPreference | null;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    grandTotal: string;
    status: OrderStatus;
    createdAt: string;
    itemCount: number;
    items: Array<{
      productName: string;
      quantity: number;
      isVeg: boolean;
      effectivePrice: string;
    }>;
  }>;
  recommendations: RecommendationWithReason[];
  aiInsights: string | null;
  insightMetadata?: InsightMetadata | null;
}

export interface RecommendationWithReason {
  product: Product;
  score: number;
  reason: string;
  reasonType: 'preference' | 'history' | 'trending' | 'similar';
}

export interface FaceRecognitionMatch {
  profileId: string;
  name: string;
  email: string;
  totalPoints: number;
  distance: number;
  similarity: number;
}
