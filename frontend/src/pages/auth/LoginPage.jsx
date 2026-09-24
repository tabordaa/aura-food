import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCart, IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight, IconShield, IconGoogle } from '../../components/Icons';
import styles from './Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/catalog');
  };

  return (
    <div className={styles['auth-page']}>
      <div className={styles['auth-topbar']}>
        <div className={styles['brand']}>
          <IconCart size={22} />
          {import.meta.env.VITE_APP_NAME || 'Aura Food'}
        </div>
        <button
          style={{ background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, border: 'none' }}
          onClick={() => navigate('/catalog')}
        >
          ← Ir a la tienda
        </button>
      </div>

      <div className={styles['auth-body']}>
        <div className={styles['auth-card']}>
          <div className={styles['card-brand']}>
            <div className={styles['brand']} style={{ fontSize: '1.4rem' }}>
              <IconCart size={26} />
              {import.meta.env.VITE_APP_NAME || 'Aura Food'}
            </div>
            <p className={styles['subtitle']}>Bienvenido de nuevo</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles['form-group']}>
              <label htmlFor="login-email">Correo electrónico</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconMail size={16} /></span>
                <input id="login-email" type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="login-password">Contraseña</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconLock size={16} /></span>
                <input id="login-password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="button" className={styles['input-toggle']} onClick={() => setShowPass(v => !v)}>
                  {showPass ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            <div className={styles['forgot-row']}>
              <a href="#forgot">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" className={styles['btn-primary']}>
              Iniciar Sesión <IconArrowRight size={16} />
            </button>
          </form>

          <div className={styles['divider']}>— o continúa con —</div>
          <button className={styles['btn-google']} type="button"><IconGoogle size={18} /> Continuar con Google</button>

          <div className={styles['auth-bottom-link']}>
            ¿No tienes cuenta?{' '}
            <a href="#" onClick={e => { e.preventDefault(); navigate('/register'); }}>Regístrate aquí</a>
          </div>
        </div>
      </div>

      <div className={styles['auth-footer-text']}>
        <IconShield size={14} />
        Acceso seguro · Entregas locales frescas 100% orgánicas
      </div>
    </div>
  );
}
