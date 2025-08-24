import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Service, SearchFilters, SearchSort, ServiceForm } from '../../types';
import apiService from '../../services/api';

interface ServiceState {
  services: Service[];
  selectedService: Service | null;
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

const initialState: ServiceState = {
  services: [],
  selectedService: null,
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
export const fetchServices = createAsyncThunk(
  'service/fetchServices',
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
      const response = await apiService.getServices(
        params.filters,
        params.sort,
        params.page,
        params.limit
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch services');
    }
  }
);

export const fetchServiceById = createAsyncThunk(
  'service/fetchServiceById',
  async (serviceId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getServiceById(serviceId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch service');
    }
  }
);

export const fetchServiceCategories = createAsyncThunk(
  'service/fetchServiceCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getServiceCategories();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch categories');
    }
  }
);

export const createService = createAsyncThunk(
  'service/createService',
  async (data: ServiceForm, { rejectWithValue }) => {
    try {
      const response = await apiService.createService(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create service');
    }
  }
);

export const updateService = createAsyncThunk(
  'service/updateService',
  async (
    data: { serviceId: string; serviceData: Partial<ServiceForm> },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.updateService(data.serviceId, data.serviceData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update service');
    }
  }
);

export const deleteService = createAsyncThunk(
  'service/deleteService',
  async (serviceId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.deleteService(serviceId);
      return { serviceId, message: response.data.message };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete service');
    }
  }
);

const serviceSlice = createSlice({
  name: 'service',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.filters = action.payload;
      state.pagination.page = 1;
    },
    setSort: (state, action: PayloadAction<SearchSort>) => {
      state.sort = action.payload;
      state.pagination.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.sort = { field: 'rating', direction: 'desc' };
      state.pagination.page = 1;
    },
    clearSelectedService: (state) => {
      state.selectedService = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Services
    builder
      .addCase(fetchServices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services = action.payload.data;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Service by ID
    builder
      .addCase(fetchServiceById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServiceById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedService = action.payload;
        state.error = null;
      })
      .addCase(fetchServiceById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Categories
    builder
      .addCase(fetchServiceCategories.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchServiceCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchServiceCategories.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Create Service
    builder
      .addCase(createService.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createService.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services.unshift(action.payload);
        state.error = null;
      })
      .addCase(createService.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Service
    builder
      .addCase(updateService.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateService.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.services.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.services[index] = action.payload;
        }
        if (state.selectedService?.id === action.payload.id) {
          state.selectedService = action.payload;
        }
        state.error = null;
      })
      .addCase(updateService.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete Service
    builder
      .addCase(deleteService.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services = state.services.filter(s => s.id !== action.payload.serviceId);
        if (state.selectedService?.id === action.payload.serviceId) {
          state.selectedService = null;
        }
        state.error = null;
      })
      .addCase(deleteService.rejected, (state, action) => {
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
  clearSelectedService,
  clearError,
} = serviceSlice.actions;

export default serviceSlice.reducer;

