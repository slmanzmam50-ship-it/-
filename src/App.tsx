import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Splash from './components/Splash';
import ClientMap from './pages/ClientMap';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
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
            <Route element={<ProtectedRoute />}>
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
          </Route>
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
