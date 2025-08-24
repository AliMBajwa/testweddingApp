// User Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'vendor' | 'admin';
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile extends User {
  user_type: 'customer';
  date_of_birth?: string;
  preferences?: {
    wedding_date?: string;
    budget_range?: string;
    location?: string;
    style_preferences?: string[];
  };
}

export interface VendorProfile extends User {
  user_type: 'vendor';
  business_name: string;
  description: string;
  category: string;
  location: string;
  website?: string;
  phone?: string;
  review_count: number;
  average_rating: number;
  is_verified: boolean;
  services: Service[];
}

export interface AdminProfile extends User {
  user_type: 'admin';
  permissions: string[];
}

// Service Types
export interface Service {
  id: string;
  vendor_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  duration_minutes: number;
  location: string;
  faq?: string;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  media: ServiceMedia[];
  availability: Availability[];
}

export interface ServiceMedia {
  id: string;
  service_id: string;
  media_type: 'image' | 'video';
  url: string;
  caption?: string;
  is_active: boolean;
  created_at: string;
}

export interface Availability {
  id: string;
  service_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

// Booking Types
export interface Booking {
  id: string;
  customer_id: string;
  vendor_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  total_amount: number;
  special_requests?: string;
  created_at: string;
  updated_at: string;
  service?: Service;
  vendor?: VendorProfile;
  customer?: CustomerProfile;
}

// Review Types
export interface Review {
  id: string;
  customer_id: string;
  vendor_id: string;
  service_id: string;
  rating: number;
  comment: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customer?: CustomerProfile;
}

// Payment Types
export interface Payment {
  id: string;
  customer_id: string;
  vendor_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

// Search and Filter Types
export interface SearchFilters {
  category?: string;
  location?: string;
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  date?: string;
  availability?: boolean;
}

export interface SearchSort {
  field: 'price' | 'rating' | 'review_count' | 'created_at';
  direction: 'asc' | 'desc';
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  VendorDetails: { vendorId: string };
  ServiceDetails: { serviceId: string };
  Booking: { serviceId: string; vendorId: string };
  Payment: { bookingId: string; amount: number };
  Profile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Profile: undefined;
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  user_type: 'customer' | 'vendor';
  phone?: string;
}

export interface VendorProfileForm {
  business_name: string;
  description: string;
  category: string;
  location: string;
  website?: string;
  phone?: string;
}

export interface ServiceForm {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  duration_minutes: number;
  location: string;
  faq?: string;
}

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
    };
    h3: {
      fontSize: number;
      fontWeight: string;
    };
    body: {
      fontSize: number;
      fontWeight: string;
    };
    caption: {
      fontSize: number;
      fontWeight: string;
    };
  };
}

