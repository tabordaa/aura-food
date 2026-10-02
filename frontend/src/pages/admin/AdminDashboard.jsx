import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IconCheck, IconMapPin, IconSearch } from '../../components/Icons';

import { fetchOrders, formatOrderId, formatPrice, parseServerDate, updateOrderStatus } from '../../utils/orders';
import styles from './Admin.module.css';

const REFRESH_MS = 15000;
const PAGE_SIZE = 8;

// Cómo ve el administrador cada estado del backend
const STATUS_META = {
  pendiente: { label: 'Pendiente',      tone: 'pending' },
  preparado: { label: 'En preparación', tone: 'progress' },
  asignado:  { label: 'En camino',      tone: 'progress' },
  entregado: { label: 'Entregado',      tone: 'done' },
  rechazado: { label: 'Rechazado',      tone: 'rejected' },
};

const TABS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'preparado', label: 'En preparación' },
  { id: 'asignado',  label: 'En camino' },
  { id: 'entregado', label: 'Entregados' },
  { id: 'rechazado', label: 'Rechazados' },
];

const NAV = [
  { id: 'pedidos',  icon: '🧾', label: 'Pedidos' },
  { id: 'products', icon: '🥑', label: 'Productos' },
  { id: 'clients',  icon: '👥', label: 'Clientes' },
  { id: 'settings', icon: '⚙️', label: 'Configuración' },
];

function timeAgo(date, now) {
  const minutes = Math.max(0, Math.round((now - date) / 60000));
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function describeItems(items) {
  const names = items.map(i => `Prod #${i.product_id}`);
  const units = items.reduce((acc, i) => acc + i.quantity, 0);
  return { names: names.join(', '), units };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tab, setTab] = useState('pendiente');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [confirmRejectId, setConfirmRejectId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await fetchOrders());
      setOnline(true);
      setLastUpdate(new Date());
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial y refresco automático para ver los pedidos que van entrando
  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function changeStatus(order, status) {
    setBusyId(order.id);
    setConfirmRejectId(null);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setOrders(list => list.map(o => (o.id === updated.id ? updated : o)));
      setToast({
        type: status === 'rechazado' ? 'warning' : 'success',
        text: status === 'rechazado'
          ? `Pedido ${formatOrderId(order.id)} rechazado`
          : `Pedido ${formatOrderId(order.id)} aceptado: pasa a preparación`,
      });
    } catch (err) {
      const unsupported = status === 'rechazado' && err.status === 422;
      setToast({
        type: 'error',
        text: unsupported
          ? 'El backend todavía no permite rechazar pedidos (falta el estado "rechazado").'
          : err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message,
      });
    } finally {
      setBusyId(null);
    }
  }

  const now = new Date();
  const counts = useMemo(() => {
    const c = { todos: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const todayOrders = orders.filter(o => isSameDay(parseServerDate(o.created_at), now) && o.status !== 'rechazado');
  const todayRevenue = todayOrders.reduce((acc, o) => acc + o.total_price, 0);
  const inProgress = (counts.preparado || 0) + (counts.asignado || 0);

  const term = search.trim().toLowerCase();
  const visible = orders.filter(o => {
    if (tab !== 'todos' && o.status !== tab) return false;
    if (!term) return true;
    return formatOrderId(o.id).includes(term)
      || String(o.id) === term
      || o.delivery_address.toLowerCase().includes(term)
      || `cliente ${o.user_id}`.includes(term)
      || describeItems(o.items).names.toLowerCase().includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectTab = (id) => { setTab(id); setPage(1); };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles['brand-logo']}>🌿</span>
          <div>
            <strong>Aura Food</strong>
            <span className={styles['brand-badge']}>Admin</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(item => (
            <button
              key={item.id}
              type="button"
              className={[styles['nav-item'], item.id === 'pedidos' ? styles.active : ''].join(' ')}
              disabled={item.id !== 'pedidos'}
              title={item.id !== 'pedidos' ? 'Próximamente' : undefined}
            >
              <span>{item.icon}</span> {item.label}
              {item.id !== 'pedidos' && <em>Pronto</em>}
              {item.id === 'pedidos' && counts.pendiente > 0 && <b className={styles['nav-badge']}>{counts.pendiente}</b>}
            </button>
          ))}
        </nav>

        <div className={styles.profile}>
          <span className={styles.avatar}>A</span>
          <div>
            <strong>{user?.name || 'Administrador'}</strong>
            <small>Supermercado</small>
          </div>
          <button type="button" className={styles.logout} onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">⎋</button>
        </div>
      </aside>

      {/* Contenido */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <IconSearch size={16} />
            <input
              placeholder="Buscar por # de pedido, cliente, dirección o producto…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </label>
          <span className={[styles.connection, online ? '' : styles.offline].join(' ')}>
            <span className={styles['connection-dot']} />
            {online ? 'Tienda en línea' : 'Sin conexión con el servidor'}
          </span>
          <span className={styles.today}>
            📅 {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </header>

        <div className={styles.content}>
          <div className={styles['page-head']}>
            <div>
              <h1><span className={styles['title-dot']} /> Gestión de pedidos</h1>
              <p>Supervisa, acepta y gestiona los pedidos en tiempo real para despacho y entrega.</p>
            </div>
            <div className={styles['refresh-group']}>
              {lastUpdate && <small>Actualizado {lastUpdate.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</small>}
              <button type="button" className={styles['btn-refresh']} onClick={() => { setLoading(true); loadOrders(); }} disabled={loading}>
                <span className={loading ? styles.spinning : ''}>⟳</span> Actualizar lista
              </button>
            </div>
          </div>

          {/* Indicadores */}
          <section className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Pedidos nuevos</span><i>🔔</i></div>
              <p className={styles['kpi-value']}>{counts.pendiente || 0}<small> por aceptar</small></p>
              {counts.pendiente > 0
                ? <span className={[styles.chip, styles['chip-alert']].join(' ')}>● Atención requerida</span>
                : <span className={styles.chip}>Todo al día</span>}
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Ingresos de hoy</span><i>💵</i></div>
              <p className={styles['kpi-value']}>{formatPrice(todayRevenue)}</p>
              <span className={styles['kpi-foot']}>{todayOrders.length} pedido{todayOrders.length !== 1 ? 's' : ''} hoy</span>
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>En curso</span><i>🛵</i></div>
              <p className={styles['kpi-value']}>{inProgress}<small> en preparación o camino</small></p>
              <span className={styles['kpi-foot']}>{counts.preparado || 0} preparando • {counts.asignado || 0} en camino</span>
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Completados</span><i>✅</i></div>
              <p className={styles['kpi-value']}>{counts.entregado || 0}<small> de {orders.length} totales</small></p>
              <span className={styles['kpi-foot']}>
                {orders.length ? Math.round(((counts.entregado || 0) / orders.length) * 100) : 0}% entregados
              </span>
            </div>
          </section>

          {/* Tabla */}
          <section className={styles.panel}>
            <div className={styles.tabs} role="tablist">
              {TABS.filter(t => t.id !== 'rechazado' || counts.rechazado).map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
                  onClick={() => selectTab(t.id)}
                >
                  {t.label}
                  {t.id === 'pendiente'
                    ? counts.pendiente > 0 && <b className={styles['tab-alert']}>{counts.pendiente}</b>
                    : <span className={styles['tab-count']}>({counts[t.id] || 0})</span>}
                </button>
              ))}
            </div>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Dirección de entrega</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className={styles['col-actions']}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && orders.length === 0 ? (
                  <tr><td colSpan={7} className={styles.empty}>Cargando pedidos…</td></tr>
                ) : pageOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      {!online && orders.length === 0
                        ? '📡 No pudimos conectar con el backend. Revisa que esté corriendo en el puerto 8000.'
                        : tab === 'pendiente' && !term ? '🎉 No hay pedidos pendientes por ahora.' : 'No hay pedidos que coincidan.'}
                    </td>
                  </tr>
                ) : pageOrders.map(order => {
                  const meta = STATUS_META[order.status] ?? { label: order.status, tone: 'progress' };
                  const created = parseServerDate(order.created_at);
                  const { names, units } = describeItems(order.items);
                  const busy = busyId === order.id;
                  return (
                    <tr key={order.id} className={busy ? styles.busy : ''}>
                      <td>
                        <div className={styles['order-id']}>
                          <span className={[styles.dot, styles[`dot-${meta.tone}`]].join(' ')} />
                          <strong>{formatOrderId(order.id)}</strong>
                        </div>
                        <small className={styles.muted}>{timeAgo(created, now)}</small>
                      </td>
                      <td>
                        <div className={styles.client}>
                          <span className={styles['client-avatar']}>C{order.user_id}</span>
                          <span>Cliente #{order.user_id}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.address}>
                          <IconMapPin size={15} />
                          <span>{order.delivery_address}</span>
                        </div>
                      </td>
                      <td>
                        <p className={styles.products} title={names}>{names}</p>
                        <span className={styles['items-chip']}>{units} unidad{units !== 1 ? 'es' : ''}</span>
                      </td>
                      <td className={styles.total}>{formatPrice(order.total_price)}</td>
                      <td>
                        <span className={[styles.status, styles[`status-${meta.tone}`]].join(' ')}>
                          {meta.tone === 'done' ? <IconCheck size={12} /> : <span className={styles['status-dot']} />}
                          {meta.label}
                        </span>
                      </td>
                      <td className={styles['col-actions']}>
                        {order.status !== 'pendiente' ? (
                          <span className={styles.muted}>—</span>
                        ) : confirmRejectId === order.id ? (
                          <div className={styles.confirm}>
                            <span>¿Rechazar?</span>
                            <button type="button" className={styles['btn-danger']} onClick={() => changeStatus(order, 'rechazado')} disabled={busy}>Sí</button>
                            <button type="button" className={styles['btn-ghost']} onClick={() => setConfirmRejectId(null)} disabled={busy}>No</button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            <button type="button" className={styles['btn-accept']} onClick={() => changeStatus(order, 'preparado')} disabled={busy}>
                              {busy ? '…' : <><IconCheck size={13} /> Aceptar</>}
                            </button>
                            <button type="button" className={styles['btn-reject']} onClick={() => setConfirmRejectId(order.id)} disabled={busy}>
                              ✕ Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.pagination}>
              <span>
                Mostrando <strong>{visible.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, visible.length)}</strong> de <strong>{visible.length}</strong> pedidos
              </span>
              <div className={styles.pages}>
                <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>‹ Anterior</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    className={n === currentPage ? styles.active : ''}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente ›</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {toast && (
        <div className={[styles.toast, styles[`toast-${toast.type}`]].join(' ')} role="status">
          {toast.text}
        </div>
      )}
    </div>
  );
}
