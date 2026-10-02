import { useAuth } from '../../context/AuthContext';
import styles from '../catalog/Catalog.module.css'; // Reusando estilos base para el navbar rápido

export default function DeliveryDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <nav className={styles['navbar']} style={{ borderBottom: '1px solid #d1d5db', background: 'white' }}>
        <div className={styles['brand']} style={{ color: '#0369a1' }}>
          🛵 Aura Delivery | Panel de Repartidor
        </div>
        <div className={styles['navbar-actions']}>
          <button className={styles['user-btn']} onClick={logout} title="Cerrar sesión">
            <div className={styles['user-avatar']} style={{ background: '#0284c7' }}>D</div>
            {user?.name || 'Repartidor'}
          </button>
        </div>
      </nav>

      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '1rem' }}>Tus entregas de hoy</h1>
        <p style={{ color: '#475569', fontSize: '1.1rem' }}>
          Este es un espacio protegido. Solo los usuarios con rol <strong>domiciliario</strong> pueden ver esta pantalla.
        </p>
        
        <div style={{ marginTop: '2rem', padding: '2rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📦</span>
          <h2 style={{ color: '#334155' }}>Panel en desarrollo</h2>
          <p style={{ color: '#64748b' }}>Pronto integraremos la lista de pedidos pendientes para entregar aquí.</p>
        </div>
      </main>
    </div>
  );
}
