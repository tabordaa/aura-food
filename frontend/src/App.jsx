import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CatalogPage  from './pages/catalog/CatalogPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import OrderTrackingPage from './pages/orders/OrderTrackingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Navigate to="/login" replace />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/catalog"  element={<CatalogPage />} />
        <Route path="/admin"    element={<AdminDashboard />} />
        <Route path="/pedidos"  element={<MyOrdersPage />} />
        <Route path="/pedidos/:id" element={<OrderTrackingPage />} />
      </Routes>
    </BrowserRouter>
  );
}