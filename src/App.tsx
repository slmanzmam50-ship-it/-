
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ClientMap from './pages/ClientMap';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

import InstallPWA from './components/InstallPWA';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <InstallPWA />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ClientMap />} />
          <Route path="login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
