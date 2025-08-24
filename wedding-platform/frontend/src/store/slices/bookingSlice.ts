import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Booking } from '../../types';
import apiService from '../../services/api';

interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  statistics: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: [],
  selectedBooking: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  },
  statistics: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchBookings = createAsyncThunk(
  'booking/fetchBookings',
  async (
    params: { page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.getBookings(params.page, params.limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch bookings');
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  'booking/fetchBookingById',
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getBookingById(bookingId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch booking');
    }
  }
);

export const createBooking = createAsyncThunk(
  'booking/createBooking',
  async (
    data: {
      service_id: string;
      vendor_id: string;
      booking_date: string;
      start_time: string;
      end_time: string;
      special_requests?: string;
      total_amount: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.createBooking(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create booking');
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'booking/updateBookingStatus',
  async (
    data: { bookingId: string; status: Booking['status'] },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.updateBookingStatus(data.bookingId, data.status);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update booking status');
    }
  }
);

export const updateBooking = createAsyncThunk(
  'booking/updateBooking',
  async (
    data: {
      bookingId: string;
      bookingData: Partial<{
        booking_date: string;
        start_time: string;
        end_time: string;
        special_requests: string;
      }>;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.updateBooking(data.bookingId, data.bookingData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update booking');
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'booking/cancelBooking',
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.cancelBooking(bookingId);
      return { bookingId, message: response.data.message };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to cancel booking');
    }
  }
);

export const fetchBookingStatistics = createAsyncThunk(
  'booking/fetchBookingStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getBookingStatistics();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch booking statistics');
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearSelectedBooking: (state) => {
      state.selectedBooking = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Bookings
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload.data;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Booking by ID
    builder
      .addCase(fetchBookingById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedBooking = action.payload;
        state.error = null;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings.unshift(action.payload);
        state.error = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Booking Status
    builder
      .addCase(updateBookingStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        if (state.selectedBooking?.id === action.payload.id) {
          state.selectedBooking = action.payload;
        }
        state.error = null;
      })
      .addCase(updateBookingStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Booking
    builder
      .addCase(updateBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        if (state.selectedBooking?.id === action.payload.id) {
          state.selectedBooking = action.payload;
        }
        state.error = null;
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Cancel Booking
    builder
      .addCase(cancelBooking.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.bookings.findIndex(b => b.id === action.payload.bookingId);
        if (index !== -1) {
          state.bookings[index].status = 'cancelled';
        }
        if (state.selectedBooking?.id === action.payload.bookingId) {
          state.selectedBooking.status = 'cancelled';
        }
        state.error = null;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Statistics
    builder
      .addCase(fetchBookingStatistics.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchBookingStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
        state.error = null;
      })
      .addCase(fetchBookingStatistics.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setPage,
  clearSelectedBooking,
  clearError,
} = bookingSlice.actions;

export default bookingSlice.reducer;

