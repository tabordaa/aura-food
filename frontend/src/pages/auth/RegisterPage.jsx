import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCart, IconMail, IconLock, IconEye, IconEyeOff, IconUser, IconPhone, IconArrowRight, IconShield, IconGoogle, IconMapPin } from '../../components/Icons';
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
const strengthLabels = ['', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Segura'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '', confirm: '' });
  const handleChange = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const strength = getStrength(form.password);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { alert('Las contraseñas no coinciden'); return; }
    if (!accepted) { alert('Debes aceptar los Términos y Condiciones'); return; }
    navigate('/catalog');
  };

  return (
    <div className={styles['auth-page']}>
      <div className={styles['auth-topbar']}>
        <div className={styles['brand']}><IconCart size={22} /> {import.meta.env.VITE_APP_NAME || 'Aura Food'}</div>
        <button style={{ background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, border: 'none' }} onClick={() => navigate('/catalog')}>
          ← Ir a la tienda
        </button>
      </div>

      <div className={styles['auth-body']}>
        <div className={[styles['auth-card'], styles['auth-card-register']].join(' ')}>
          <div className={styles['card-brand']}>
            <div className={styles['brand']} style={{ fontSize: '1.4rem' }}><IconCart size={26} /> {import.meta.env.VITE_APP_NAME || 'Aura Food'}</div>
            <h2>Crea tu cuenta</h2>
            <p className={styles['subtitle']}>Compra tu mercado desde casa, rápido y fácil</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles['form-group']}>
              <label htmlFor="reg-name">Nombre completo</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconUser size={16} /></span>
                <input id="reg-name" type="text" placeholder="Tu nombre y apellido" value={form.name} onChange={handleChange('name')} required />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-email">Correo electrónico</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconMail size={16} /></span>
                <input id="reg-email" type="email" placeholder="tu@correo.com" value={form.email} onChange={handleChange('email')} required />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-phone">Teléfono</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconPhone size={16} /></span>
                <input id="reg-phone" type="tel" placeholder="+57 300 000 0000" value={form.phone} onChange={handleChange('phone')} />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-address">Dirección de entrega</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconMapPin size={16} /></span>
                <input id="reg-address" type="text" placeholder="Calle 123 # 45-67, Barrio, Ciudad" value={form.address} onChange={handleChange('address')} required />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-password">Contraseña</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconLock size={16} /></span>
                <input id="reg-password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={handleChange('password')} required />
                <button type="button" className={styles['input-toggle']} onClick={() => setShowPass(v => !v)}>
                  {showPass ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className={styles['strength-bar-wrapper']}>
                  <span>Seguridad</span>
                  <div className={styles['strength-bars']}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={[styles['strength-bar'], i <= strength ? (strength >= 4 ? styles.active : styles.half) : ''].join(' ')} />
                    ))}
                  </div>
                  <span className={styles['strength-label']}>{strengthLabels[strength]}</span>
                </div>
              )}
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-confirm">Confirmar contraseña</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconLock size={16} /></span>
                <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={form.confirm} onChange={handleChange('confirm')} required />
                <button type="button" className={styles['input-toggle']} onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
            <div className={styles['checkbox-group']}>
              <input id="reg-terms" type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
              <label htmlFor="reg-terms">Acepto los <a href="#terms">Términos y Condiciones</a> y la <a href="#privacy">Política de Privacidad</a></label>
            </div>
            <button type="submit" className={styles['btn-primary']}>Crear Cuenta <IconArrowRight size={16} /></button>
          </form>

          <div className={styles['divider']}>— o regístrate con —</div>
          <button className={styles['btn-google']} type="button"><IconGoogle size={18} /> Continuar con Google</button>
          <div className={styles['auth-bottom-link']}>
            ¿Ya tienes cuenta?{' '}
            <a href="#" onClick={e => { e.preventDefault(); navigate('/login'); }}>Inicia sesión</a>
          </div>
        </div>
      </div>

      <div className={styles['auth-footer-text']}><IconShield size={14} /> Acceso seguro · Entregas locales frescas 100% orgánicas</div>
    </div>
  );
}
