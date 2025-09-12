import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { config } from '../config';

export interface FaceDetectionResult {
  success: boolean;
  faces_count: number;
  faces: Array<{
    facial_area: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    confidence: number;
  }>;
  error?: string;
}

export interface EmbeddingResult {
  success: boolean;
  model: string;
  embedding_size: number;
  embeddings: Array<{
    embedding: number[];
    facial_area: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    confidence: number;
  }>;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  distance: number;
  threshold: number;
  model: string;
  error?: string;
}

// Recommendation types
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
}

export interface RecommendationWithReason {
  product: RecommendationProduct;
  score: number;
  reason: string;
  reasonType: 'preference' | 'history' | 'trending' | 'similar';
}

export interface UpsellSuggestion {
  productName: string;
  reason: string;
}

export interface InsightMetadata {
  favoriteItems?: string[];
  favoriteCategories?: string[];
  orderingPattern?: 'frequent' | 'weekly' | 'biweekly' | 'occasional';
  avgVisitFrequency?: number;
  dietaryStyle?: 'vegetarian' | 'non_vegetarian' | 'mixed';
  spendingTier?: 'budget' | 'medium' | 'premium';
  loyaltyStatus?: 'new' | 'regular' | 'loyal' | 'vip';
  lastAnalyzedOrderCount?: number;
  // Communication suggestions (generated with insight)
  greetings?: string[];
  conversationTopics?: string[];
  specialNotes?: string[];
  upsellSuggestions?: UpsellSuggestion[];
}

export interface PreferenceResult {
  success: boolean;
  data?: {
    vegPreference: number;
    priceRange: string;
    avgOrderValue?: number;
    categoryAffinities?: Record<string, number>;
    tagAffinities?: Record<string, number>;
    favoriteProducts?: string[];
    preferredCategories?: string[];
    preferredTags?: string[];
    totalOrders?: number;
    insight?: string;
    insightMetadata?: InsightMetadata;
    source?: string;
  };
  error?: string;
}

export interface PersonalizedRecommendationResult {
  success: boolean;
  data?: {
    recommendations: RecommendationWithReason[];
    insights?: string;
    preferences?: {
      vegPreference?: number;
      priceRange?: string;
      preferredCategories?: string[];
    };
    source?: string;
  };
  error?: string;
}

export interface TrendingResult {
  success: boolean;
  data?: {
    products: RecommendationProduct[];
    source?: string;
  };
  error?: string;
}

export interface SimilarProductsResult {
  success: boolean;
  data?: {
    products: RecommendationProduct[];
    source?: string;
  };
  error?: string;
}

export interface CommunicationSuggestionsResult {
  success: boolean;
  data?: {
    openingLines: string[];
    conversationTopics: string[];
    specialNotes: string[];
    upsellSuggestions: Array<{
      productName: string;
      reason: string;
    }>;
  };
  error?: string;
}

class PythonClientService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.pythonBackendUrl,
      timeout: 60000, // 60 seconds for ML processing
    });
  }

  async detectFaces(imageBuffer: Buffer, filename: string): Promise<FaceDetectionResult> {
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename });

    const response = await this.client.post<FaceDetectionResult>('/api/detect', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  async getEmbeddings(imageBuffer: Buffer, filename: string): Promise<EmbeddingResult> {
    const formData = new FormData();
    formData.append('image', imageBuffer, { filename });

    const response = await this.client.post<EmbeddingResult>('/api/represent', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  async verifyFaces(
    image1Buffer: Buffer,
    image2Buffer: Buffer
  ): Promise<VerificationResult> {
    const formData = new FormData();
    formData.append('image1', image1Buffer, { filename: 'image1.jpg' });
    formData.append('image2', image2Buffer, { filename: 'image2.jpg' });

    const response = await this.client.post<VerificationResult>('/api/verify', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Recommendation methods

  async analyzePreferences(profileId: string): Promise<PreferenceResult> {
    try {
      const response = await this.client.post<PreferenceResult>(
        `/api/recommendations/analyze/${profileId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error analyzing preferences:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to analyze preferences',
      };
    }
  }

  async generateRecommendations(
    profileId: string,
    limit: number = 10
  ): Promise<PersonalizedRecommendationResult> {
    try {
      const response = await this.client.post<PersonalizedRecommendationResult>(
        `/api/recommendations/generate/${profileId}?limit=${limit}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error generating recommendations:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to generate recommendations',
      };
    }
  }

  async getTrendingProducts(limit: number = 10): Promise<TrendingResult> {
    try {
      const response = await this.client.get<TrendingResult>(
        `/api/recommendations/trending?limit=${limit}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting trending products:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get trending products',
      };
    }
  }

  async getSimilarProducts(
    productId: string,
    limit: number = 5
  ): Promise<SimilarProductsResult> {
    try {
      const response = await this.client.post<SimilarProductsResult>(
        `/api/recommendations/similar/${productId}?limit=${limit}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting similar products:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get similar products',
      };
    }
  }

  async getCommunicationSuggestions(
    profileId: string,
    profileData: {
      id: string;
      name: string;
      email: string;
      totalPoints: number;
    },
    orderHistory: Array<{
      id: string;
      orderNumber: string;
      grandTotal: string;
      createdAt: string;
      items: Array<{
        productName: string;
        quantity: number;
        isVeg: boolean;
        categoryName: string | null;
      }>;
    }>,
    preferences: any
  ): Promise<CommunicationSuggestionsResult> {
    try {
      const response = await this.client.post<CommunicationSuggestionsResult>(
        `/api/recommendations/communication/${profileId}`,
        {
          profile: profileData,
          order_history: orderHistory,
          preferences: preferences,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting communication suggestions:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get communication suggestions',
      };
    }
  }
}

export const pythonClient = new PythonClientService();
