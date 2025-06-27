import { Navbar } from '@/components/layout/Navbar';
import { AppProvider } from '@/app/api/contexts/AppContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <Navbar />
      <main>
        {children}
      </main>
    </AppProvider>
  );
} 