
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ClientMap from './pages/ClientMap';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ClientMap />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
