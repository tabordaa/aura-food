import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CatalogPage  from './pages/catalog/CatalogPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import OrderTrackingPage from './pages/orders/OrderTrackingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import DeliveryPage from './pages/delivery/DeliveryPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"         element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/catalog"  element={<ProtectedRoute allowedRoles={['cliente']}><CatalogPage /></ProtectedRoute>} />
          <Route path="/pedidos"  element={<ProtectedRoute allowedRoles={['cliente']}><MyOrdersPage /></ProtectedRoute>} />
          <Route path="/pedidos/:id" element={<ProtectedRoute allowedRoles={['cliente']}><OrderTrackingPage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute allowedRoles={['domiciliario']}><DeliveryPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}