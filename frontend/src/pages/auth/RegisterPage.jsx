import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { IconCart, IconMail, IconLock, IconEye, IconEyeOff, IconUser, IconPhone, IconArrowRight, IconShield, IconMapPin } from '../../components/Icons';
import GoogleButton from '../../components/GoogleButton';
import { prefersReducedMotion } from '../../utils/motion';
import AuthBackground from './AuthBackground';
import RippleButton from './RippleButton';
import styles from './Auth.module.css';

function getStrength(p) {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

const strengthLabels = ['Muy débil', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Segura'];

function getStrengthTone(strength) {
  if (strength <= 2) return styles['strength-label-weak'];
  if (strength === 3) return styles['strength-label-medium'];
  if (strength === 4) return styles['strength-label-good'];
  return styles['strength-label-strong'];
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user, loginWithGoogle } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

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

  const handleChange = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const strength = getStrength(form.password);

  // Redirigir si ya está logueado
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'domiciliario') return <Navigate to="/delivery" replace />;
    return <Navigate to="/catalog" replace />;
  }

  const triggerError = (message) => {
    setError(message);
    if (!prefersReducedMotion()) setShaking(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setShaking(false);

    if (form.password.length < 8) { triggerError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (form.password !== form.confirm) { triggerError('Las contraseñas no coinciden'); return; }
    if (!accepted) { triggerError('Debes aceptar los Términos y Condiciones'); return; }

    setError('');
    setLoading(true);
    try {
      // Enviar solo los campos que espera el backend
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password,
      });
    } catch (err) {
      triggerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-page']}>
      <AuthBackground />

      <div className={styles['auth-topbar']}>
        <div className={styles['brand']}>
          <IconCart size={22} /> {import.meta.env.VITE_APP_NAME || 'Aura Food'}
        </div>
      </div>

      <div className={styles['auth-body']}>
        <div className={[styles['auth-card-wrap'], styles['auth-card-wrap-register']].join(' ')}>
          <div
            className={[styles['auth-card'], styles['auth-card-register'], shaking ? styles['auth-card-shake'] : ''].filter(Boolean).join(' ')}
            onAnimationEnd={e => { if (e.target === e.currentTarget) setShaking(false); }}
          >
            <div className={styles['card-brand']}>
              <div className={[styles.brand, styles['brand-lg'], styles.stagger, styles['d-1']].join(' ')}>
                <IconCart size={26} /> {import.meta.env.VITE_APP_NAME || 'Aura Food'}
              </div>
              <h2 className={[styles.stagger, styles['d-2']].join(' ')}>Crea tu cuenta</h2>
              <p className={[styles['subtitle'], styles.stagger, styles['d-3']].join(' ')}>
                Compra tu mercado desde casa, rápido y fácil
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className={styles['form-error']} role="alert">{error}</div>}

              <div className={[styles['form-group'], styles.stagger, styles['d-4']].join(' ')}>
                <label htmlFor="reg-name">Nombre completo</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconUser size={16} /></span>
                  <input id="reg-name" type="text" placeholder="Tu nombre y apellido" value={form.name} onChange={handleChange('name')} required />
                </div>
              </div>

              <div className={[styles['form-group'], styles.stagger, styles['d-5']].join(' ')}>
                <label htmlFor="reg-email">Correo electrónico</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconMail size={16} /></span>
                  <input id="reg-email" type="email" placeholder="tu@correo.com" value={form.email} onChange={handleChange('email')} required />
                </div>
              </div>

              <div className={[styles['form-group'], styles.stagger, styles['d-6']].join(' ')}>
                <label htmlFor="reg-phone">Teléfono</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconPhone size={16} /></span>
                  <input id="reg-phone" type="tel" placeholder="+57 300 000 0000" value={form.phone} onChange={handleChange('phone')} />
                </div>
              </div>

              <div className={[styles['form-group'], styles.stagger, styles['d-7']].join(' ')}>
                <label htmlFor="reg-address">Dirección de entrega</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconMapPin size={16} /></span>
                  <input id="reg-address" type="text" placeholder="Calle 123 # 45-67, Barrio, Ciudad" value={form.address} onChange={handleChange('address')} required />
                </div>
              </div>

              <div className={[styles['form-group'], styles.stagger, styles['d-8']].join(' ')}>
                <label htmlFor="reg-password">Contraseña</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconLock size={16} /></span>
                  <input
                    id="reg-password"
                    className={styles['input-with-toggle']}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                    minLength={8}
                    maxLength={72}
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
                {form.password.length > 0 && (
                  <div className={styles['strength-bar-wrapper']}>
                    <span>Seguridad</span>
                    <div className={styles['strength-track']} aria-hidden="true">
                      <div className={`${styles['strength-fill']} ${styles[`strength-lvl-${strength}`]}`} />
                    </div>
                    <span className={`${styles['strength-label']} ${getStrengthTone(strength)}`}>
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              <div className={[styles['form-group'], styles.stagger, styles['d-9']].join(' ')}>
                <label htmlFor="reg-confirm">Confirmar contraseña</label>
                <div className={styles['input-wrapper']}>
                  <span className={styles['input-icon']}><IconLock size={16} /></span>
                  <input
                    id="reg-confirm"
                    className={styles['input-with-toggle']}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={handleChange('confirm')}
                    required
                  />
                  <button
                    type="button"
                    className={styles['input-toggle']}
                    onClick={() => setShowConfirm(v => !v)}
                    aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                  >
                    <span key={showConfirm ? 'hide' : 'show'} className={styles['input-toggle-icon']}>
                      {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </span>
                  </button>
                </div>
              </div>

              <div className={[styles['checkbox-group'], styles.stagger, styles['d-10']].join(' ')}>
                <input id="reg-terms" type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
                <label htmlFor="reg-terms">
                  Acepto los <a href="#terms">Términos y Condiciones</a> y la <a href="#privacy">Política de Privacidad</a>
                </label>
              </div>

              <div className={[styles.stagger, styles['d-11']].join(' ')}>
                <RippleButton type="submit" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className={styles['btn-spinner']} aria-hidden="true" />
                      Creando cuenta…
                    </>
                  ) : (
                    <>
                      Crear Cuenta
                      <span className={styles['btn-arrow']}><IconArrowRight size={16} /></span>
                    </>
                  )}
                </RippleButton>
              </div>
            </form>

            <div className={[styles.stagger, styles['d-12']].join(' ')}>
              <GoogleButton label="o regístrate con" onCredential={handleGoogle} />
            </div>

            <div className={[styles['auth-bottom-link'], styles.stagger, styles['d-13']].join(' ')}>
              ¿Ya tienes cuenta?{' '}
              <a href="#" onClick={e => { e.preventDefault(); navigate('/login'); }}>Inicia sesión</a>
            </div>
          </div>
        </div>
      </div>

      <div className={styles['auth-footer-text']}>
        <IconShield size={14} /> Acceso seguro · Entregas locales frescas 100% orgánicas
      </div>
    </div>
  );
}
