import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/components/auth/Login';
import Signup from '@/components/auth/Signup';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardHome from '@/components/dashboard/DashboardHome';
import UsersList from '@/components/dashboard/UsersList';
// TODO: Uncomment once AuthCallback component is created
// import AuthCallback from './components/auth/AuthCallback';
import './index.css';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  console.log("ProtectedRoute - User state:", { user: user?.id || "null", loading });
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    console.log("No user found, redirecting to login");
    return <Navigate to="/login" />;
  }
  
  console.log("User authenticated, rendering protected content");
  return <>{children}</>;
};

// Public route (redirects if already logged in)
const PublicRoute = ({ children }: React.PropsWithChildren<{}>) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Settings component (placeholder)
const Settings = () => {
  return <div>Settings Page</div>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <Navigate to="/login" replace />
              </PublicRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <Login />
                </div>
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <Signup />
                </div>
              </PublicRoute>
            } 
          />
          
          {/* Auth callback route for OAuth */}
          {/* TODO: Uncomment once AuthCallback component is created */}
          {/* <Route 
            path="/auth/callback" 
            element={<AuthCallback />} 
          /> */}
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          >
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<UsersList />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;