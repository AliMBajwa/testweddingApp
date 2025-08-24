import { 
  ApiResponse, 
  PaginatedResponse, 
  User, 
  VendorProfile, 
  Service, 
  Booking, 
  Payment, 
  Review,
  SearchFilters,
  SearchSort,
  LoginForm,
  RegisterForm,
  VendorProfileForm,
  ServiceForm
} from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = await this.getAuthToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string | null> {
    // This will be implemented with secure storage
    // For now, return null
    return null;
  }

  // Auth endpoints
  async register(data: RegisterForm): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.request<{ token: string }>('/auth/refresh', {
      method: 'POST',
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // User endpoints
  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // Vendor endpoints
  async getVendors(
    filters?: SearchFilters,
    sort?: SearchSort,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<VendorProfile>>> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.price_min) params.append('price_min', filters.price_min.toString());
    if (filters?.price_max) params.append('price_max', filters.price_max.toString());
    if (filters?.rating_min) params.append('rating_min', filters.rating_min.toString());
    if (filters?.date) params.append('date', filters.date);
    if (filters?.availability) params.append('availability', filters.availability.toString());
    if (sort?.field) params.append('sort_by', sort.field);
    if (sort?.direction) params.append('sort_order', sort.direction);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request<PaginatedResponse<VendorProfile>>(`/vendors?${params.toString()}`);
  }

  async getVendorById(vendorId: string): Promise<ApiResponse<VendorProfile>> {
    return this.request<VendorProfile>(`/vendors/${vendorId}`);
  }

  async updateVendorProfile(data: VendorProfileForm): Promise<ApiResponse<VendorProfile>> {
    return this.request<VendorProfile>('/vendors/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getVendorCategories(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/vendors/categories');
  }

  // Service endpoints
  async getServices(
    filters?: SearchFilters,
    sort?: SearchSort,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Service>>> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.price_min) params.append('price_min', filters.price_min.toString());
    if (filters?.price_max) params.append('price_max', filters.price_max.toString());
    if (filters?.rating_min) params.append('rating_min', filters.rating_min.toString());
    if (filters?.date) params.append('date', filters.date);
    if (filters?.availability) params.append('availability', filters.availability.toString());
    if (sort?.field) params.append('sort_by', sort.field);
    if (sort?.direction) params.append('sort_order', sort.direction);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request<PaginatedResponse<Service>>(`/services?${params.toString()}`);
  }

  async getServiceById(serviceId: string): Promise<ApiResponse<Service>> {
    return this.request<Service>(`/services/${serviceId}`);
  }

  async createService(data: ServiceForm): Promise<ApiResponse<Service>> {
    return this.request<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(serviceId: string, data: Partial<ServiceForm>): Promise<ApiResponse<Service>> {
    return this.request<Service>(`/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(serviceId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/services/${serviceId}`, {
      method: 'DELETE',
    });
  }

  async getVendorServices(): Promise<ApiResponse<Service[]>> {
    return this.request<Service[]>('/services/vendor');
  }

  async getServiceCategories(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/services/categories');
  }

  // Booking endpoints
  async getBookings(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Booking>>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request<PaginatedResponse<Booking>>(`/bookings?${params.toString()}`);
  }

  async getBookingById(bookingId: string): Promise<ApiResponse<Booking>> {
    return this.request<Booking>(`/bookings/${bookingId}`);
  }

  async createBooking(data: {
    service_id: string;
    vendor_id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    special_requests?: string;
    total_amount: number;
  }): Promise<ApiResponse<Booking>> {
    return this.request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBookingStatus(
    bookingId: string,
    status: Booking['status']
  ): Promise<ApiResponse<Booking>> {
    return this.request<Booking>(`/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateBooking(
    bookingId: string,
    data: Partial<{
      booking_date: string;
      start_time: string;
      end_time: string;
      special_requests: string;
    }>
  ): Promise<ApiResponse<Booking>> {
    return this.request<Booking>(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelBooking(bookingId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    });
  }

  async getBookingStatistics(): Promise<ApiResponse<{
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  }>> {
    return this.request('/bookings/statistics');
  }

  // Payment endpoints
  async getPayments(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Payment>>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request<PaginatedResponse<Payment>>(`/payments?${params.toString()}`);
  }

  async getPaymentById(paymentId: string): Promise<ApiResponse<Payment>> {
    return this.request<Payment>(`/payments/${paymentId}`);
  }

  async createPaymentIntent(bookingId: string, amount: number): Promise<ApiResponse<{
    client_secret: string;
    payment_intent_id: string;
  }>> {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, amount }),
    });
  }

  async processRefund(
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<ApiResponse<Payment>> {
    return this.request<Payment>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  async getPaymentStatistics(): Promise<ApiResponse<{
    total_revenue: number;
    total_payments: number;
    pending_payments: number;
    completed_payments: number;
    failed_payments: number;
  }>> {
    return this.request('/payments/statistics');
  }

  // Review endpoints
  async createReview(data: {
    vendor_id: string;
    service_id: string;
    rating: number;
    comment: string;
  }): Promise<ApiResponse<Review>> {
    return this.request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getVendorReviews(
    vendorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Review>>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    return this.request<PaginatedResponse<Review>>(`/vendors/${vendorId}/reviews?${params.toString()}`);
  }
}

export const apiService = new ApiService();
export default apiService;

