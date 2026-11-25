import styles from '../pages/auth/Auth.module.css';

// Cuentas de demostración: solo se muestran las que tengan contraseña configurada en el .env del frontend.
// Pensado para presentaciones; en producción se dejan vacías y el panel no aparece.
const ACCOUNTS = [
  { key: 'cliente', label: 'Cliente', email: 'test@aurafood.com', password: import.meta.env.VITE_DEMO_CUSTOMER_PASSWORD },
  { key: 'admin', label: 'Admin', email: 'admin@aurafood.com', password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD },
  { key: 'domiciliario', label: 'Domiciliario', email: 'domicilio@aurafood.com', password: import.meta.env.VITE_DEMO_COURIER_PASSWORD },
].filter(account => account.password);

export default function DemoAccounts({ onSelect }) {
  if (ACCOUNTS.length === 0) return null;

  return (
    <div className={styles['demo-box']}>
      <p className={styles['demo-title']}>Cuentas demo</p>
      <ul className={styles['demo-list']}>
        {ACCOUNTS.map(account => (
          <li key={account.key}>
            <span className={styles['demo-role']}>{account.label}:</span> {account.email} / {account.password}
          </li>
        ))}
      </ul>
      <div className={styles['demo-actions']}>
        {ACCOUNTS.map(account => (
          <button key={account.key} type="button" className={styles['demo-chip']} onClick={() => onSelect(account.email, account.password)}>
            Usar {account.label.toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
