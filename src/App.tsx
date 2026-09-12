import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/work/ProtectedRoute';
import { ToastProvider } from './components/work/Toast';
import { NotificationProvider } from './context/NotificationContext';

// Public site components (eager loaded for instant first render)
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

// Sleek loading spinner matching theme
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full">
    <div className="w-7 h-7 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
  </div>
);

// Lazy Loaded Auth Pages
const Login = lazy(() => import('./pages/auth/Login').then((m) => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));

// Lazy Loaded Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminEmployees = lazy(() => import('./pages/admin/Employees').then((m) => ({ default: m.AdminEmployees })));
const AdminEmployeeDetails = lazy(() => import('./pages/admin/EmployeeDetails').then((m) => ({ default: m.AdminEmployeeDetails })));
const AdminClients = lazy(() => import('./pages/admin/Clients').then((m) => ({ default: m.AdminClients })));
const AdminClientDetails = lazy(() => import('./pages/admin/ClientDetails').then((m) => ({ default: m.AdminClientDetails })));
const AdminProjects = lazy(() => import('./pages/admin/Projects').then((m) => ({ default: m.AdminProjects })));
const AdminProjectDetails = lazy(() => import('./pages/admin/ProjectDetails').then((m) => ({ default: m.AdminProjectDetails })));
const AdminWorkLogs = lazy(() => import('./pages/admin/WorkLogs').then((m) => ({ default: m.AdminWorkLogs })));
const AdminAttendance = lazy(() => import('./pages/admin/Attendance').then((m) => ({ default: m.AdminAttendance })));
const AdminPayments = lazy(() => import('./pages/admin/Payments').then((m) => ({ default: m.AdminPayments })));
const AdminCommissions = lazy(() => import('./pages/admin/Commissions').then((m) => ({ default: m.AdminCommissions })));
const AdminReceipts = lazy(() => import('./pages/admin/Receipts').then((m) => ({ default: m.AdminReceipts })));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics').then((m) => ({ default: m.AdminAnalytics })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((m) => ({ default: m.AdminSettings })));

// Lazy Loaded Employee Pages
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard').then((m) => ({ default: m.EmployeeDashboard })));
const EmployeeProjects = lazy(() => import('./pages/employee/Projects').then((m) => ({ default: m.EmployeeProjects })));
const EmployeeProjectDetails = lazy(() => import('./pages/employee/ProjectDetails').then((m) => ({ default: m.EmployeeProjectDetails })));
const EmployeeWork = lazy(() => import('./pages/employee/Work').then((m) => ({ default: m.EmployeeWork })));
const EmployeeAttendance = lazy(() => import('./pages/employee/Attendance').then((m) => ({ default: m.EmployeeAttendance })));
const EmployeeReceipts = lazy(() => import('./pages/employee/Receipts').then((m) => ({ default: m.EmployeeReceipts })));
const EmployeeProfile = lazy(() => import('./pages/employee/Profile').then((m) => ({ default: m.EmployeeProfile })));

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
              <Suspense fallback={<PageLoader />}>
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
              </Suspense>
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
