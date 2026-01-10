import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import donorReducer from './slices/donorSlice';
import projectReducer from './slices/projectSlice';
import crmReducer from './slices/crmSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    donor: donorReducer,
    project: projectReducer,
    crm: crmReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ['auth/setUser'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'meta.arg.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
