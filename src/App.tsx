import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './components/Splash';
import ClientMap from './pages/ClientMap';
import AdminDashboard from './pages/AdminDashboard';
import CompanyInvoices from './pages/CompanyInvoices';
import Login from './pages/Login';
import CompanyDashboard from './pages/CompanyDashboard';
import BranchPanel from './pages/BranchPanel';
import WorkerDashboard from './pages/WorkerDashboard';
import QrView from './pages/QrView';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

import InstallPWA from './components/InstallPWA';

const PublicIndex = () => {
  if (localStorage.getItem('isAuthenticated') === 'true') {
    return <Navigate to="/admin" replace />;
  }
  if (localStorage.getItem('logged_company_id')) {
    return <Navigate to="/company" replace />;
  }
  if (localStorage.getItem('logged_branch_id')) {
    return <Navigate to="/branch" replace />;
  }
  if (localStorage.getItem('logged_worker_id')) {
    return <Navigate to="/worker" replace />;
  }
  // iOS PWA fix: if this device was previously used as a worker device,
  // always redirect to worker login instead of showing the public map
  if (localStorage.getItem('worker_device') === 'true') {
    return <Navigate to="/login?type=worker" replace />;
  }
  return <ClientMap />;
};

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    const path = window.location.pathname;
    // Skip splash for worker portal (speed) and map page
    if (path.includes('/worker') || path.includes('/map')) return false;
    return true;
  });

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ServiceWorkerRegistration>;
      const reg = customEvent.detail;
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };
    window.addEventListener('swUpdateAvailable', handleUpdate);
    return () => window.removeEventListener('swUpdateAvailable', handleUpdate);
  }, []);

  // Dynamic PWA Manifest Switching
  useEffect(() => {
    let manifestFile = '/manifest-driver.json';
    
    // Check search param first
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type') || urlParams.get('appMode');
    const hostname = window.location.hostname;
    const isWorkerLoggedIn = !!localStorage.getItem('logged_worker_id');
    
    if (typeParam === 'worker' || isWorkerLoggedIn || window.location.pathname.startsWith('/worker')) {
      // Worker portal – opens directly on /worker
      manifestFile = '/manifest-worker.json';
      document.title = " ";
    } else if (typeParam === 'company' || hostname.startsWith('b2b.') || hostname.startsWith('company.') || hostname.includes('company') || hostname.includes('b2b')) {
      manifestFile = '/manifest-company.json';
      document.title = "سلمان الخالدي - الشركات B2B";
    } else if (typeParam === 'branch' || hostname.startsWith('branch.') || hostname.startsWith('workshop.') || hostname.includes('branch') || hostname.includes('workshop')) {
      manifestFile = '/manifest-branch.json';
      document.title = "سلمان الخالدي - بوابة الفروع";
    } else {
      document.title = "سلمان الخالدي - خريطة الفروع";
    }
    
    // Find or create manifest link element
    let linkElement = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (linkElement) {
      linkElement.href = manifestFile;
    } else {
      linkElement = document.createElement('link');
      linkElement.rel = 'manifest';
      linkElement.href = manifestFile;
      document.head.appendChild(linkElement);
    }
  }, []);

  // Subdomain detection logic
  const hostname = window.location.hostname;
  let appMode: 'admin' | 'company' | 'branch' | 'public' = 'public';

  if (hostname.startsWith('admin.') || hostname.includes('admin')) {
    appMode = 'admin';
  } else if (hostname.startsWith('b2b.') || hostname.startsWith('company.') || hostname.includes('company') || hostname.includes('b2b')) {
    appMode = 'company';
  } else if (hostname.startsWith('branch.') || hostname.startsWith('workshop.') || hostname.includes('branch') || hostname.includes('workshop')) {
    appMode = 'branch';
  } else {
    // Local development fallback via query parameter (?appMode=admin|company|branch)
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('appMode');
    if (modeParam === 'admin') appMode = 'admin';
    else if (modeParam === 'company') appMode = 'company';
    else if (modeParam === 'branch') appMode = 'branch';
  }

  // Render routes depending on the subdomain appMode
  const renderRoutes = () => {
    switch (appMode) {
      case 'admin':
        return (
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route element={<ProtectedRoute />}>
                <Route index element={<AdminDashboard />} />
                <Route path="admin" element={<Navigate to="/" replace />} />
                <Route path="admin/company-invoices/:companyId" element={<CompanyInvoices />} />
              </Route>
              <Route path="login" element={<Login />} />
              <Route path="map" element={<ClientMap />} />
              <Route path="qr" element={<QrView />} />
              {/* Fallback redirects for admin portal */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        );
      
      case 'company':
        return (
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<CompanyDashboard />} />
              <Route path="login" element={<Login />} />
              <Route path="company" element={<Navigate to="/" replace />} />
              <Route path="map" element={<ClientMap />} />
              <Route path="qr" element={<QrView />} />
              {/* Fallback redirects for B2B portal */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        );

      case 'branch':
        return (
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<BranchPanel />} />
              <Route path="login" element={<Login />} />
              <Route path="branch" element={<Navigate to="/" replace />} />
              <Route path="map" element={<ClientMap />} />
              <Route path="qr" element={<QrView />} />
              {/* Fallback redirects for branch portal */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        );

      case 'public':
      default:
        return (
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<PublicIndex />} />
              <Route path="login" element={<Login />} />
              <Route path="map" element={<ClientMap />} />
              <Route path="qr" element={<QrView />} />
              <Route path="company" element={<CompanyDashboard />} />
              <Route path="branch" element={<BranchPanel />} />
              <Route path="worker" element={<WorkerDashboard />} />
              <Route element={<ProtectedRoute />}>
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="admin/company-invoices/:companyId" element={<CompanyInvoices />} />
              </Route>
              {/* General fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        );
    }
  };

  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <InstallPWA />

      {showSplash ? (
        <Splash onComplete={() => setShowSplash(false)} />
      ) : (
        renderRoutes()
      )}
    </BrowserRouter>
  );
}

export default App;
