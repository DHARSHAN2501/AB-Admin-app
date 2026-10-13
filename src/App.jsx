import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';

// Route-level code splitting for production bundle optimization
const AdminDashboard = lazy(() => 
  import('./pages/Dashboard').then(m => ({ default: m.AdminDashboard }))
);
const Customers = lazy(() => 
  import('./pages/Customers').then(m => ({ default: m.Customers }))
);
const MenuManagement = lazy(() => 
  import('./pages/MenuManagement').then(m => ({ default: m.MenuManagement }))
);

const PageLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Loading module...</span>
  </div>
);

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header & Bottom Icon Navigation Panel */}
      <Sidebar />

      {/* Dynamic Content Views */}
      <main 
        className="flex-1 px-3 sm:px-6 pt-3 sm:pt-6 overflow-x-hidden"
        style={{ paddingBottom: '7.5rem' }}
      >
        <Suspense fallback={<PageLoadingFallback />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
};

export function App() {
  React.useEffect(() => {
    document.title = 'Admin Portal - Arunachala Bhavan';
    let link = document.querySelector("link[rel*='icon']");
    if (link) {
      link.href = '/favicon.svg';
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/customers" element={<AdminLayout><Customers /></AdminLayout>} />
          <Route path="/orders" element={<Navigate to="/customers" replace />} />
          <Route path="/menu" element={<AdminLayout><MenuManagement /></AdminLayout>} />
          <Route path="/categories" element={<Navigate to="/menu" replace />} />
          <Route path="/tables" element={<Navigate to="/customers" replace />} />
          <Route path="/qr" element={<Navigate to="/menu" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
