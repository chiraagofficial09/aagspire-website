import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/work/ProtectedRoute';
import { ToastProvider } from './components/work/Toast';
import { NotificationProvider } from './context/NotificationContext';

// Public site components
import CursorEffect from './components/CursorEffect';
import ImageProtection from './components/ImageProtection';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Process from './components/Process';
import Testimonials from './components/Testimonials';
import About from './components/About';
import CTA from './components/CTA';
import Footer from './components/Footer';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { EmployeeLayout } from './layouts/EmployeeLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Admin Pages
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminEmployees } from './pages/admin/Employees';
import { AdminEmployeeDetails } from './pages/admin/EmployeeDetails';
import { AdminClients } from './pages/admin/Clients';
import { AdminClientDetails } from './pages/admin/ClientDetails';
import { AdminProjects } from './pages/admin/Projects';
import { AdminProjectDetails } from './pages/admin/ProjectDetails';
import { AdminWorkLogs } from './pages/admin/WorkLogs';
import { AdminAttendance } from './pages/admin/Attendance';
import { AdminPayments } from './pages/admin/Payments';
import { AdminCommissions } from './pages/admin/Commissions';
import { AdminReceipts } from './pages/admin/Receipts';
import { AdminAnalytics } from './pages/admin/Analytics';
import { AdminSettings } from './pages/admin/Settings';

// Employee Pages
import { EmployeeDashboard } from './pages/employee/Dashboard';
import { EmployeeProjects } from './pages/employee/Projects';
import { EmployeeProjectDetails } from './pages/employee/ProjectDetails';
import { EmployeeWork } from './pages/employee/Work';
import { EmployeeAttendance } from './pages/employee/Attendance';
import { EmployeeReceipts } from './pages/employee/Receipts';
import { EmployeeProfile } from './pages/employee/Profile';

const queryClient = new QueryClient();

// Public Marketing Website Component
const PublicWebsite: React.FC = () => {
  const [ignited, setIgnited] = useState(false);
  const [isWorkOpen, setIsWorkOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const handleOpenWork = () => {
    if (!ignited) setIgnited(true);
    setIsContactOpen(false);
    setIsWorkOpen(true);
  };

  const handleCloseWork = () => {
    setIsWorkOpen(false);
  };

  const handleOpenContact = () => {
    if (!ignited) setIgnited(true);
    setIsWorkOpen(false);
    setIsContactOpen(true);
  };

  const handleCloseContact = () => {
    setIsContactOpen(false);
  };

  return (
    <div
      className={`relative min-h-screen bg-obsidian text-white noise-overlay ${
        !ignited ? 'overflow-hidden max-h-screen' : 'overflow-x-hidden'
      }`}
    >
      <CursorEffect />
      <ImageProtection />
      <Navbar
        visible={ignited}
        isWorkOpen={isWorkOpen}
        onOpenWork={handleOpenWork}
        onCloseWork={handleCloseWork}
        onOpenContact={handleOpenContact}
      />

      <main className="relative z-10">
        <Hero
          ignited={ignited}
          onIgnite={() => setIgnited(true)}
          onOpenWork={handleOpenWork}
          onOpenContact={handleOpenContact}
        />
        {ignited && (
          <div className="transition-opacity duration-1000 opacity-100">
            <Services isWorkOpen={isWorkOpen} onCloseWork={handleCloseWork} />
            <Process />
            <Testimonials />
            <About />
            <CTA
              isContactOpen={isContactOpen}
              onOpenContact={handleOpenContact}
              onCloseContact={handleCloseContact}
              onOpenWork={handleOpenWork}
            />
          </div>
        )}
      </main>
      {ignited && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<PublicWebsite />} />

            {/* Authentication Portal */}
            <Route
              path="/work/login"
              element={
                <AuthLayout title="Aagspire Work Portal" subtitle="Sign in to your internal workspace">
                  <Login />
                </AuthLayout>
              }
            />
            <Route
              path="/work/forgot-password"
              element={
                <AuthLayout title="Reset Credentials" subtitle="Recover your Aagspire Work access">
                  <ForgotPassword />
                </AuthLayout>
              }
            />
            <Route
              path="/work/reset-password"
              element={
                <AuthLayout title="Set New Password" subtitle="Establish verified account password">
                  <ResetPassword />
                </AuthLayout>
              }
            />

            {/* Admin Management System (Protected) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="employees" element={<AdminEmployees />} />
              <Route path="employees/:id" element={<AdminEmployeeDetails />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="clients/:id" element={<AdminClientDetails />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="projects/:id" element={<AdminProjectDetails />} />
              <Route path="work-logs" element={<AdminWorkLogs />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="commissions" element={<AdminCommissions />} />
              <Route path="settlements" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="receipts" element={<AdminReceipts />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="reports" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Employee Portal (Protected) */}
            <Route
              path="/employee"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="dashboard" element={<EmployeeDashboard />} />
              <Route path="projects" element={<EmployeeProjects />} />
              <Route path="projects/:id" element={<EmployeeProjectDetails />} />
              <Route path="work" element={<EmployeeWork />} />
              <Route path="timesheets" element={<Navigate to="/employee/work" replace />} />
              <Route path="attendance" element={<EmployeeAttendance />} />
              <Route path="calendar" element={<Navigate to="/employee/attendance" replace />} />
              <Route path="earnings" element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="commissions" element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="settlements" element={<Navigate to="/employee/dashboard" replace />} />
              <Route path="receipts" element={<EmployeeReceipts />} />
              <Route path="reports" element={<Navigate to="/employee/receipts" replace />} />
              <Route path="profile" element={<EmployeeProfile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
