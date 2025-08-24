import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isLoading: boolean;
  loadingMessage: string;
  showModal: boolean;
  modalType: 'success' | 'error' | 'info' | 'warning' | null;
  modalMessage: string;
  modalTitle: string;
  showNotification: boolean;
  notificationType: 'success' | 'error' | 'info' | 'warning';
  notificationMessage: string;
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
}

const initialState: UIState = {
  isLoading: false,
  loadingMessage: '',
  showModal: false,
  modalType: null,
  modalMessage: '',
  modalTitle: '',
  showNotification: false,
  notificationType: 'info',
  notificationMessage: '',
  sidebarOpen: false,
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    showModal: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'info' | 'warning';
      title: string;
      message: string;
    }>) => {
      state.showModal = true;
      state.modalType = action.payload.type;
      state.modalTitle = action.payload.title;
      state.modalMessage = action.payload.message;
    },
    hideModal: (state) => {
      state.showModal = false;
      state.modalType = null;
      state.modalMessage = '';
      state.modalTitle = '';
    },
    showNotification: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'info' | 'warning';
      message: string;
    }>) => {
      state.showNotification = true;
      state.notificationType = action.payload.type;
      state.notificationMessage = action.payload.message;
    },
    hideNotification: (state) => {
      state.showNotification = false;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    clearUI: (state) => {
      state.isLoading = false;
      state.loadingMessage = '';
      state.showModal = false;
      state.modalType = null;
      state.modalMessage = '';
      state.modalTitle = '';
      state.showNotification = false;
      state.notificationMessage = '';
    },
  },
});

export const {
  setLoading,
  showModal,
  hideModal,
  showNotification,
  hideNotification,
  toggleSidebar,
  setSidebarOpen,
  toggleTheme,
  setTheme,
  clearUI,
} = uiSlice.actions;

export default uiSlice.reducer;

