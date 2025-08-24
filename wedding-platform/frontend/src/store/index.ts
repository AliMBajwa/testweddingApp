import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import vendorReducer from './slices/vendorSlice';
import serviceReducer from './slices/serviceSlice';
import bookingReducer from './slices/bookingSlice';
import paymentReducer from './slices/paymentSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vendor: vendorReducer,
    service: serviceReducer,
    booking: bookingReducer,
    payment: paymentReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

