import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { IconCart, IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight, IconShield } from '../../components/Icons';
import GoogleButton from '../../components/GoogleButton';
import DemoAccounts from '../../components/DemoAccounts';
import { prefersReducedMotion } from '../../utils/motion';
import AuthBackground from './AuthBackground';
import RippleButton from './RippleButton';
import styles from './Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, loginWithGoogle } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [searchParams] = useSearchParams();
  const typingTimerRef = useRef(null);

  const sessionExpired = searchParams.get('expired') === '1';

  // Limpiar el intervalo de tipeo demo si el usuario sale de la pantalla
  useEffect(() => () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
  }, []);

  const stopDemoTyping = () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const handleGoogle = async (credential) => {
    setError('');
    setShaking(false);
    try {
      await loginWithGoogle(credential);
    } catch (err) {
      setError(err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message);
      if (!prefersReducedMotion()) setShaking(true);
    }
  };

  // Redirigir si ya está logueado
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'domiciliario') return <Navigate to="/delivery" replace />;
    return <Navigate to="/catalog" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    stopDemoTyping();
    setError('');
    setShaking(false);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      if (!prefersReducedMotion()) setShaking(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (demoEmail, demoPassword) => {
    stopDemoTyping();
    setError('');
    setShaking(false);
    setPassword(demoPassword);

    if (prefersReducedMotion() || !demoEmail) {
      setEmail(demoEmail);
      return;
    }

    // Tipeo progresivo del correo (~400 ms en total) mientras la contraseña queda lista
    const stepMs = Math.max(16, Math.round(400 / demoEmail.length));
    let index = 0;
    setEmail('');
    typingTimerRef.current = setInterval(() => {
      index += 1;
      setEmail(demoEmail.slice(0, index));
      if (index >= demoEmail.length) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    }, stepMs);
  };

  return (
    <div className={styles['auth-page']}>
      <AuthBackground />

      <div className={styles['auth-topbar']}>
        <div className={styles['brand']}>
          <IconCart size={22} />
          {import.meta.env.VITE_APP_NAME || 'Aura Food'}
        </div>
      </div>

      <div className={styles['auth-body']}>
        <div className={styles['auth-card-wrap']}>
          <div
            className={[styles['auth-card'], shaking ? styles['auth-card-shake'] : ''].filter(Boolean).join(' ')}
            onAnimationEnd={e => { if (e.target === e.currentTarget) setShaking(false); }}
          >
            <div className={styles['card-brand']}>
              <div className={[styles.brand, styles['brand-lg'], styles.stagger, styles['d-1']].join(' ')}>
                <IconCart size={26} />
                {import.meta.env.VITE_APP_NAME || 'Aura Food'}
              </div>
              <p className={[styles['subtitle'], styles.stagger, styles['d-2']].join(' ')}>Bienvenido de nuevo</p>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className={styles['form-error']} role="alert">{error}</div>}
              {!error && sessionExpired && (
                <div className={styles['form-notice']} role="status">
                  Tu sesión expiró. Inicia sesión de nuevo para continuar.
                </div>
              )}

              <div className={[styles['form-group'], styles.stagger, styles['d-3']].join(' ')}>
                <label htmlFor="login-email">Correo electrónico</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconMail size={16} /></span>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={e => { stopDemoTyping(); setEmail(e.target.value); }}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={[styles['form-group'], styles.stagger, styles['d-4']].join(' ')}>
                <label htmlFor="login-password">Contraseña</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconLock size={16} /></span>
                  <input
                    id="login-password"
                    className={styles['input-with-toggle']}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles['input-toggle']}
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <span key={showPass ? 'hide' : 'show'} className={styles['input-toggle-icon']}>
                      {showPass ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </span>
                  </button>
                </div>
              </div>

              <div className={[styles.stagger, styles['d-5']].join(' ')}>
                <RippleButton type="submit" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className={styles['btn-spinner']} aria-hidden="true" />
                      Ingresando…
                    </>
                  ) : (
                    <>
                      Iniciar Sesión
                      <span className={styles['btn-arrow']}><IconArrowRight size={16} /></span>
                    </>
                  )}
                </RippleButton>
              </div>
            </form>

            <div className={[styles.stagger, styles['d-6']].join(' ')}>
              <DemoAccounts onSelect={handleDemoSelect} />
            </div>

            <div className={[styles.stagger, styles['d-7']].join(' ')}>
              <GoogleButton label="o continúa con" onCredential={handleGoogle} />
            </div>

            <div className={[styles['auth-bottom-link'], styles.stagger, styles['d-8']].join(' ')}>
              ¿No tienes cuenta?{' '}
              <a href="#" onClick={e => { e.preventDefault(); navigate('/register'); }}>Regístrate aquí</a>
            </div>
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
