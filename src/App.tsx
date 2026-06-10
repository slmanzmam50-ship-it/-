import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './components/Splash';
import ClientMap from './pages/ClientMap';
import AdminDashboard from './pages/AdminDashboard';
import CompanyInvoices from './pages/CompanyInvoices';
import Login from './pages/Login';
import CompanyDashboard from './pages/CompanyDashboard';
import BranchPanel from './pages/BranchPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

import InstallPWA from './components/InstallPWA';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <InstallPWA />
      {showSplash ? (
        <Splash onComplete={() => setShowSplash(false)} />
      ) : (
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<ClientMap />} />
            <Route path="login" element={<Login />} />
            <Route path="company" element={<CompanyDashboard />} />
            <Route path="branch" element={<BranchPanel />} />
            <Route element={<ProtectedRoute />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/company-invoices/:companyId" element={<CompanyInvoices />} />
            </Route>
          </Route>
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
