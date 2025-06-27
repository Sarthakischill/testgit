import { Navbar } from '@/components/layout/Navbar';
import { AppProvider } from '@/app/api/contexts/AppContext';
import AuthGuard from '@/components/auth/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppProvider>
        <Navbar />
        <main>{children}</main>
      </AppProvider>
    </AuthGuard>
  );
}