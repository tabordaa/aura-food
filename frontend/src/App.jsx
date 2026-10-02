import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CatalogPage  from './pages/catalog/CatalogPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import OrderTrackingPage from './pages/orders/OrderTrackingPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"         element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/catalog"  element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
          <Route path="/pedidos"  element={<ProtectedRoute><MyOrdersPage /></ProtectedRoute>} />
          <Route path="/pedidos/:id" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}