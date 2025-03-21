import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import Login from '@/components/auth/Login';
import Signup from '@/components/auth/Signup';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardHome from '@/components/dashboard/DashboardHome';
import UsersList from '@/components/dashboard/UsersList';
import { MaintenanceSearch } from '@/components/dashboard/MaintenanceSearch';
// TODO: Uncomment once AuthCallback component is created
// import AuthCallback from './components/auth/AuthCallback';
import './index.css';
import { AddSenderForm } from '@/components/forms/AddSenderForm';
import UpdateRecordPage from '@/app/dashboard/maintenance/update/page';
import TollFreePage from '@/app/dashboard/maintenance/toll-free/page';
import AdminPage from '@/app/dashboard/admin/page';

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
  return <SidebarProvider>{children}</SidebarProvider>;
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

// New route components
const Reporting = () => {
  return <div>Reporting Page</div>;
};

const ActionItems = () => {
  return <div>Action Items Page</div>;
};

const Maintenance = () => {
  return <div>Maintenance Page</div>;
};

const AddNewSender = () => {
  return (
    <div className="container mx-auto pt-2 pb-4">
      <h1 className="text-2xl font-bold mb-2">Add New Sender</h1>
      <div className="max-w-2xl mx-auto">
        <AddSenderForm />
      </div>
    </div>
  );
};

const SearchRecord = () => {
  return <MaintenanceSearch />;
};

const SendersNotDelivering = () => {
  return <div>Senders Not Delivering Page</div>;
};

function App() {
  React.useEffect(() => {
    console.log('App component mounted');
  }, []);
  
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root route */}
          <Route 
            path="/" 
            element={<RootRoute />} 
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
            <Route path="reporting" element={<Reporting />} />
            <Route path="action-items" element={<ActionItems />} />
            <Route path="maintenance">
              <Route index element={<Maintenance />} />
              <Route path="add-sender" element={<AddNewSender />} />
              <Route path="search" element={<SearchRecord />} />
              <Route path="not-delivering" element={<SendersNotDelivering />} />
              <Route path="update" element={<UpdateRecordPage />} />
              <Route path="toll-free">
                <Route index element={<TollFreePage />} />
                <Route path=":id" element={<TollFreePage />} />
              </Route>
            </Route>
            <Route path="users" element={<UsersList />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Root route handler
const RootRoute = () => {
  const { user, loading } = useAuth();
  
  console.log('RootRoute rendering:', { user: user?.id || 'null', loading });
  
  if (loading) {
    console.log('RootRoute: Loading state');
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (user) {
    console.log('RootRoute: User found, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('RootRoute: No user, redirecting to login');
  return <Navigate to="/login" replace />;
};

export default App;