import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/work/ProtectedRoute';
import { ToastProvider } from './components/work/Toast';
import { AlertProvider } from './context/AlertContext';
import { NotificationProvider } from './context/NotificationContext';

// Public site components (eager loaded for instant first render)
import CursorEffect from './components/CursorEffect';
import ImageProtection from './components/ImageProtection';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { AuthLayout } from './layouts/AuthLayout';

// Below-the-fold sections only render after ignite, so they are split out of the
// initial bundle and prefetched while the browser is idle.
const loadServices = () => import('./components/Services');
const loadProcess = () => import('./components/Process');
const loadTestimonials = () => import('./components/Testimonials');
const loadAbout = () => import('./components/About');
const loadCTA = () => import('./components/CTA');
const loadFooter = () => import('./components/Footer');

const Services = lazy(loadServices);
const Process = lazy(loadProcess);
const Testimonials = lazy(loadTestimonials);
const About = lazy(loadAbout);
const CTA = lazy(loadCTA);
const Footer = lazy(loadFooter);

const prefetchPublicSections = () => {
  loadServices();
  loadProcess();
  loadTestimonials();
  loadAbout();
  loadCTA();
  loadFooter();
};

// Lazy Loaded Layouts (keeps portal code out of the public landing bundle)
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const EmployeeLayout = lazy(() => import('./layouts/EmployeeLayout').then((m) => ({ default: m.EmployeeLayout })));

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
const AdminCashBankBalance = lazy(() => import('./pages/admin/CashBankBalance').then((m) => ({ default: m.AdminCashBankBalance })));
const AdminPayments = lazy(() => import('./pages/admin/Payments').then((m) => ({ default: m.AdminPayments })));
const AdminCommissions = lazy(() => import('./pages/admin/Commissions').then((m) => ({ default: m.AdminCommissions })));
const AdminOfficeExpenses = lazy(() => import('./pages/admin/OfficeExpenses').then((m) => ({ default: m.AdminOfficeExpenses })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((m) => ({ default: m.AdminSettings })));
const AdminTermsManagement = lazy(() => import('./pages/admin/TermsManagement').then((m) => ({ default: m.TermsManagement })));

// Lazy Loaded Employee Pages
const EmployeeDashboard = lazy(() => import('./pages/employee/Dashboard').then((m) => ({ default: m.EmployeeDashboard })));
const EmployeeProjects = lazy(() => import('./pages/employee/Projects').then((m) => ({ default: m.EmployeeProjects })));
const EmployeeProjectDetails = lazy(() => import('./pages/employee/ProjectDetails').then((m) => ({ default: m.EmployeeProjectDetails })));
const EmployeeWork = lazy(() => import('./pages/employee/Work').then((m) => ({ default: m.EmployeeWork })));
const EmployeeAttendance = lazy(() => import('./pages/employee/Attendance').then((m) => ({ default: m.EmployeeAttendance })));
const EmployeeProfile = lazy(() => import('./pages/employee/Profile').then((m) => ({ default: m.EmployeeProfile })));
const EmployeeTermsAndConditions = lazy(() => import('./pages/employee/TermsAndConditions').then((m) => ({ default: m.EmployeeTermsAndConditions })));

// Portal chunks are prefetched once the role is known, so navigating between portal
// pages doesn't wait for each page's code to download on click.
const adminChunkLoaders = [
  () => import('./layouts/AdminLayout'),
  () => import('./pages/admin/Dashboard'),
  () => import('./pages/admin/Employees'),
  () => import('./pages/admin/EmployeeDetails'),
  () => import('./pages/admin/Clients'),
  () => import('./pages/admin/ClientDetails'),
  () => import('./pages/admin/Projects'),
  () => import('./pages/admin/ProjectDetails'),
  () => import('./pages/admin/WorkLogs'),
  () => import('./pages/admin/Attendance'),
  () => import('./pages/admin/CashBankBalance'),
  () => import('./pages/admin/Payments'),
  () => import('./pages/admin/Commissions'),
  () => import('./pages/admin/OfficeExpenses'),
  () => import('./pages/admin/Settings'),
  () => import('./pages/admin/TermsManagement'),
];
const employeeChunkLoaders = [
  () => import('./layouts/EmployeeLayout'),
  () => import('./pages/employee/Dashboard'),
  () => import('./pages/employee/Projects'),
  () => import('./pages/employee/ProjectDetails'),
  () => import('./pages/employee/Work'),
  () => import('./pages/employee/Attendance'),
  () => import('./pages/employee/Profile'),
  () => import('./pages/employee/TermsAndConditions'),
];

const PortalPrefetcher: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  useEffect(() => {
    if (role !== 'admin' && role !== 'employee') return;
    const loaders = role === 'admin' ? adminChunkLoaders : employeeChunkLoaders;
    // Layout + dashboard right away (in parallel with auth/data requests), the rest when idle
    loaders.slice(0, 2).forEach((load) => load().catch(() => {}));
    const prefetchRest = () => loaders.slice(2).forEach((load) => load().catch(() => {}));
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetchRest, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(prefetchRest, 2000);
    return () => window.clearTimeout(id);
  }, [role]);

  return null;
};

const queryClient = new QueryClient();

// Public Marketing Website Component
const PublicWebsite: React.FC = () => {
  const [ignited, setIgnited] = useState(false);
  const [isWorkOpen, setIsWorkOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetchPublicSections, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(prefetchPublicSections, 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (ignited) prefetchPublicSections();
  }, [ignited]);

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
            <Suspense fallback={null}>
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
            </Suspense>
          </div>
        )}
      </main>
      {ignited && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PortalPrefetcher />
          <ToastProvider>
            <AlertProvider>
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
                    <Route path="cash-bank-balance" element={<AdminCashBankBalance />} />
                    <Route path="commissions" element={<AdminCommissions />} />
                    <Route path="expenses" element={<AdminOfficeExpenses />} />
                    <Route path="settlements" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="receipts" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="analytics" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="reports" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="terms" element={<AdminTermsManagement />} />
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
                    <Route path="receipts" element={<Navigate to="/employee/dashboard" replace />} />
                    <Route path="reports" element={<Navigate to="/employee/receipts" replace />} />
                    <Route path="profile" element={<EmployeeProfile />} />
                    <Route path="terms" element={<EmployeeTermsAndConditions />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </AlertProvider>
        </ToastProvider>
      </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
