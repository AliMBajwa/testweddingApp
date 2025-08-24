import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Payment } from '../../types';
import apiService from '../../services/api';

interface PaymentState {
  payments: Payment[];
  selectedPayment: Payment | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  statistics: {
    total_revenue: number;
    total_payments: number;
    pending_payments: number;
    completed_payments: number;
    failed_payments: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  payments: [],
  selectedPayment: null,
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
export const fetchPayments = createAsyncThunk(
  'payment/fetchPayments',
  async (
    params: { page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.getPayments(params.page, params.limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payments');
    }
  }
);

export const fetchPaymentById = createAsyncThunk(
  'payment/fetchPaymentById',
  async (paymentId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getPaymentById(paymentId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payment');
    }
  }
);

export const createPaymentIntent = createAsyncThunk(
  'payment/createPaymentIntent',
  async (
    data: { bookingId: string; amount: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.createPaymentIntent(data.bookingId, data.amount);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create payment intent');
    }
  }
);

export const processRefund = createAsyncThunk(
  'payment/processRefund',
  async (
    data: { paymentId: string; amount: number; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiService.processRefund(data.paymentId, data.amount, data.reason);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to process refund');
    }
  }
);

export const fetchPaymentStatistics = createAsyncThunk(
  'payment/fetchPaymentStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getPaymentStatistics();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payment statistics');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    clearSelectedPayment: (state) => {
      state.selectedPayment = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Payments
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload.data;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Payment by ID
    builder
      .addCase(fetchPaymentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPayment = action.payload;
        state.error = null;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Payment Intent
    builder
      .addCase(createPaymentIntent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPaymentIntent.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Process Refund
    builder
      .addCase(processRefund.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(processRefund.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.payments.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = action.payload;
        }
        state.error = null;
      })
      .addCase(processRefund.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Statistics
    builder
      .addCase(fetchPaymentStatistics.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchPaymentStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
        state.error = null;
      })
      .addCase(fetchPaymentStatistics.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setPage,
  clearSelectedPayment,
  clearError,
} = paymentSlice.actions;

export default paymentSlice.reducer;

