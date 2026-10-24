import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { AUTH_EXPIRED_EVENT } from '../services/api';
import { AuthContext } from './authContextObject';
import { useNavigate } from 'react-router';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Solo hay algo que cargar si quedó un token guardado de una sesión anterior
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const navigate = useNavigate();

  useEffect(() => {
    // Intentar recuperar el usuario si hay un token en localStorage
    if (!localStorage.getItem('token')) return;
    authService.getMe()
      .then(userData => {
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Si el backend responde 401 (token vencido o inválido) se cierra la sesión y se vuelve al login
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      navigate('/login?expired=1', { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [navigate]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('token', data.access_token);
    const userData = await authService.getMe();
    setUser(userData);
    
    // Redirección basada en rol
    if (userData.role === 'admin') {
      navigate('/admin');
    } else if (userData.role === 'domiciliario') {
      navigate('/delivery');
    } else {
      navigate('/catalog');
    }
  };

  const register = async (userData) => {
    await authService.register(userData);
    // Después de registrar, hacemos login automáticamente
    await login(userData.email, userData.password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
