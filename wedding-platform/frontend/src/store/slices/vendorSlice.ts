import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VendorProfile, SearchFilters, SearchSort } from '../../types';
import apiService from '../../services/api';

interface VendorState {
  vendors: VendorProfile[];
  selectedVendor: VendorProfile | null;
  categories: string[];
  filters: SearchFilters;
  sort: SearchSort;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: VendorState = {
  vendors: [],
  selectedVendor: null,
  categories: [],
  filters: {},
  sort: { field: 'rating', direction: 'desc' },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  },
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchVendors = createAsyncThunk(
  'vendor/fetchVendors',
  async (
    params: {
      filters?: SearchFilters;
      sort?: SearchSort;
      page?: number;
      limit?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.getVendors(
        params.filters,
        params.sort,
        params.page,
        params.limit
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch vendors');
    }
  }
);

export const fetchVendorById = createAsyncThunk(
  'vendor/fetchVendorById',
  async (vendorId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getVendorById(vendorId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch vendor');
    }
  }
);

export const fetchVendorCategories = createAsyncThunk(
  'vendor/fetchVendorCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getVendorCategories();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch categories');
    }
  }
);

export const updateVendorProfile = createAsyncThunk(
  'vendor/updateVendorProfile',
  async (
    data: {
      business_name: string;
      description: string;
      category: string;
      location: string;
      website?: string;
      phone?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.updateVendorProfile(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page when filters change
    },
    setSort: (state, action: PayloadAction<SearchSort>) => {
      state.sort = action.payload;
      state.pagination.page = 1; // Reset to first page when sort changes
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.sort = { field: 'rating', direction: 'desc' };
      state.pagination.page = 1;
    },
    clearSelectedVendor: (state) => {
      state.selectedVendor = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Vendors
    builder
      .addCase(fetchVendors.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vendors = action.payload.data;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Vendor by ID
    builder
      .addCase(fetchVendorById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchVendorById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedVendor = action.payload;
        state.error = null;
      })
      .addCase(fetchVendorById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Categories
    builder
      .addCase(fetchVendorCategories.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchVendorCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchVendorCategories.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update Profile
    builder
      .addCase(updateVendorProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateVendorProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the vendor in the list if it exists
        const index = state.vendors.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vendors[index] = action.payload;
        }
        // Update selected vendor if it's the same one
        if (state.selectedVendor?.id === action.payload.id) {
          state.selectedVendor = action.payload;
        }
        state.error = null;
      })
      .addCase(updateVendorProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setFilters,
  setSort,
  setPage,
  clearFilters,
  clearSelectedVendor,
  clearError,
} = vendorSlice.actions;

export default vendorSlice.reducer;

