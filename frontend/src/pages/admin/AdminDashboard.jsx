import { useAuth } from '../../context/AuthContext';
import styles from '../catalog/Catalog.module.css'; // Reusando estilos base para el navbar rápido

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <nav className={styles['navbar']} style={{ borderBottom: '1px solid #eee' }}>
        <div className={styles['brand']}>
          🛡️ Aura Food | Panel Administrativo
        </div>
        <div className={styles['navbar-actions']}>
          <button className={styles['user-btn']} onClick={logout} title="Cerrar sesión">
            <div className={styles['user-avatar']} style={{ background: '#ff4b4b' }}>A</div>
            {user?.name || 'Administrador'}
          </button>
        </div>
      </nav>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', color: '#1a1a1a', marginBottom: '1rem' }}>Bienvenido al Panel de Control</h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Este es un espacio protegido. Solo los usuarios con rol <strong>admin</strong> pueden ver esta pantalla.
        </p>
        
        <div style={{ marginTop: '2rem', padding: '2rem', background: 'white', borderRadius: '12px', border: '1px dashed #ccc', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🚧</span>
          <h2 style={{ color: '#333' }}>En construcción</h2>
          <p style={{ color: '#666' }}>Aquí integraremos la gestión de productos y pedidos globales.</p>
        </div>
      </main>
    </div>
  );
}
