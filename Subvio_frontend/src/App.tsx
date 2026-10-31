import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState, PageLoader as Loader } from '@/components/common';
import { STAFF } from '@/lib/constants';
import type { Role } from '@/types';
import Landing from '@/pages/Landing';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth/AuthPages';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customers = lazy(() => import('@/pages/Customers'));
const Products = lazy(() => import('@/pages/Products'));
const Plans = lazy(() => import('@/pages/Plans'));
const Taxes = lazy(() => import('@/pages/Taxes'));
const Discounts = lazy(() => import('@/pages/Discounts'));
const Templates = lazy(() => import('@/pages/Templates'));
const Staff = lazy(() => import('@/pages/Staff'));
const Payments = lazy(() => import('@/pages/Payments'));
const Reports = lazy(() => import('@/pages/Reports'));
const Profile = lazy(() => import('@/pages/Profile'));
const SubscriptionList = lazy(() => import('@/pages/subscriptions/SubscriptionList'));
const SubscriptionForm = lazy(() => import('@/pages/subscriptions/SubscriptionForm'));
const SubscriptionDetail = lazy(() => import('@/pages/subscriptions/SubscriptionDetail'));
const InvoiceList = lazy(() => import('@/pages/invoices/InvoiceList'));
const InvoiceDetail = lazy(() => import('@/pages/invoices/InvoiceDetail'));

/** Signed in → role shell. Guests see the landing page at "/" and are sent to login (then back) elsewhere. */
function Root() {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <Loader />;
  if (user) return <AppShell />;
  if (pathname === '/') return <Landing />;
  return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <Loader />;
  const next = params.get('next');
  return user ? <Navigate to={next?.startsWith('/') ? next : '/'} replace /> : <>{children}</>;
}

function RoleGuard({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<GuestOnly><Landing key="login" initialMode="login" /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Landing key="signup" initialMode="signup" /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/home" element={<Landing />} />

        <Route path="/" element={<Root />}>
          <Route index element={<Dashboard />} />
          <Route path="subscriptions" element={<SubscriptionList />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="settings" element={<Profile />} />

          <Route element={<RoleGuard roles={STAFF} />}>
            <Route path="subscriptions/new" element={<SubscriptionForm />} />
            <Route path="subscriptions/:id/edit" element={<SubscriptionForm />} />
            <Route path="customers" element={<Customers />} />
            <Route path="templates" element={<Templates />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="products" element={<Products />} />
            <Route path="plans" element={<Plans />} />
            <Route path="discounts" element={<Discounts />} />
            <Route path="taxes" element={<Taxes />} />
          </Route>
          <Route element={<RoleGuard roles={['ADMIN']} />}>
            <Route path="staff" element={<Staff />} />
          </Route>
          <Route path="*" element={<EmptyState title="Page not found" message="The page you are looking for does not exist." />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
