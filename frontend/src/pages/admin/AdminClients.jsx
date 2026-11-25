import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconMapPin } from '../../components/Icons';
import { adminService } from '../../services/admin.service';
import { formatPrice, initials, parseServerDate } from '../../utils/format';
import AdminLayout from './AdminLayout';
import AnimatedNumber from './AnimatedNumber';
import TableSkeleton from './TableSkeleton';
import styles from './Admin.module.css';

const CLIENT_SKELETON_COLS = [
  { width: 135, avatar: true },
  { width: 120, twoLines: true },
  { width: 84, pill: true },
  { width: 86 },
  { width: 92 },
  { width: 92 },
];

const TABS = [
  { id: 'todos',    label: 'Todos' },
  { id: 'con',      label: 'Con pedidos' },
  { id: 'sin',      label: 'Sin pedidos' },
];

function emptyClientsCopy({ online, hasClients, tab, search }) {
  if (!online && !hasClients) {
    return {
      emoji: '📡',
      title: 'Sin conexión con el servidor',
      desc: 'Revisa que el backend esté corriendo en el puerto 8000 e intenta actualizar.',
    };
  }
  if (search) {
    return {
      emoji: '🔍',
      title: 'No encontramos ese cliente',
      desc: `Ningún cliente coincide con "${search}". Prueba con otro nombre, correo o teléfono.`,
    };
  }
  if (tab === 'con') {
    return {
      emoji: '🛍️',
      title: 'Todavía no hay clientes con pedidos',
      desc: 'Apenas entren las primeras compras podrás ver su historial aquí.',
    };
  }
  if (tab === 'sin') {
    return {
      emoji: '🎉',
      title: '¡Todos tus clientes ya compraron!',
      desc: 'Cada persona registrada ha realizado al menos un pedido.',
    };
  }
  return {
    emoji: '👋',
    title: 'Aún no hay clientes registrados',
    desc: 'Cuando las personas creen su cuenta en Aura Food aparecerán en esta lista.',
  };
}

function matchesTab(client, tab) {
  if (tab === 'con') return client.orders_count > 0;
  if (tab === 'sin') return client.orders_count === 0;
  return true;
}

function formatDate(value) {
  if (!value) return '—';
  return parseServerDate(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todos');

  const loadClients = useCallback(() => adminService.getClients()
    .then(list => { setClients(list); setOnline(true); })
    .catch(() => setOnline(false))
    .finally(() => setLoading(false)), []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const stats = useMemo(() => {
    const buyers = clients.filter(c => c.orders_count > 0);
    const spent = clients.reduce((acc, c) => acc + c.total_spent, 0);
    return {
      total: clients.length,
      buyers: buyers.length,
      orders: clients.reduce((acc, c) => acc + c.orders_count, 0),
      average: buyers.length ? spent / buyers.length : 0,
      top: buyers[0], // el backend los ordena por total gastado
    };
  }, [clients]);

  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t.id, clients.filter(c => matchesTab(c, t.id)).length])), [clients]);

  const term = search.trim().toLowerCase();
  const visible = clients
    .filter(c => matchesTab(c, tab))
    .filter(c => !term || [c.name, c.email, c.phone, c.address].some(v => v?.toLowerCase().includes(term)));

  return (
    <AdminLayout
      active="clients"
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar cliente por nombre, correo, teléfono o dirección…"
      online={online}
    >
      <div className={styles.content}>
        <div className={styles['page-head']}>
          <div>
            <h1><span className={styles['title-dot']} /> Clientes</h1>
            <p>Conoce quién compra en tu tienda, cuánto ha gastado y cuándo fue su último pedido.</p>
          </div>
          <div className={styles['refresh-group']}>
            <button type="button" className={styles['btn-refresh']} onClick={() => { setLoading(true); loadClients(); }} disabled={loading}>
              <span className={loading ? styles.spinning : ''}>⟳</span> Actualizar lista
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Clientes registrados</span><i>👥</i></div>
            <p className={styles['kpi-value']}><AnimatedNumber value={stats.total} /><small> en total</small></p>
            <span className={styles['kpi-foot']}>{stats.buyers} ya hicieron al menos un pedido</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Pedidos realizados</span><i>🧾</i></div>
            <p className={styles['kpi-value']}><AnimatedNumber value={stats.orders} /><small> pedidos</small></p>
            <span className={styles['kpi-foot']}>Incluye rechazados y cancelados</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Gasto promedio</span><i>💵</i></div>
            <p className={styles['kpi-value']}><AnimatedNumber value={stats.average} currency /></p>
            <span className={styles['kpi-foot']}>Por cliente con pedidos</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Mejor cliente</span><i>⭐</i></div>
            <p className={[styles['kpi-value'], styles['kpi-name']].join(' ')}>{stats.top?.name ?? '—'}</p>
            <span className={styles['kpi-foot']}>
              {stats.top ? `${formatPrice(stats.top.total_spent)} en ${stats.top.orders_count} pedido${stats.top.orders_count !== 1 ? 's' : ''}` : 'Aún no hay compras'}
            </span>
          </div>
        </section>

        {/* Tabla */}
        <section className={styles.panel}>
          <div className={styles.tabs} role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className={styles['tab-count']}>({counts[t.id]})</span>
              </button>
            ))}
          </div>

          <div className={styles['table-wrap']}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Pedidos</th>
                  <th>Total gastado</th>
                  <th>Último pedido</th>
                  <th>Cliente desde</th>
                </tr>
              </thead>
              <tbody
                key={loading && clients.length === 0 ? 'loading' : `${tab}-${term}`}
                className={styles['tbody-fade']}
                aria-busy={loading && clients.length === 0}
              >
                {loading && clients.length === 0 ? (
                  <TableSkeleton columns={CLIENT_SKELETON_COLS} rows={5} />
                ) : visible.length === 0 ? (
                  (() => {
                    const empty = emptyClientsCopy({ online, hasClients: clients.length > 0, tab, search: search.trim() });
                    return (
                      <tr>
                        <td colSpan={6} className={styles.empty}>
                          <div className={styles['empty-box']}>
                            <span className={styles['empty-emoji']} aria-hidden="true">{empty.emoji}</span>
                            <strong>{empty.title}</strong>
                            <p>{empty.desc}</p>
                          </div>
                        </td>
                      </tr>
                    );
                  })()
                ) : visible.map((c, index) => (
                  <tr
                    key={c.id}
                    style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                    className={[styles['row-stagger'], styles['row-elevated']].join(' ')}
                  >
                    <td>
                      <div className={styles.client}>
                        <span className={styles['client-avatar']}>{initials(c.name)}</span>
                        <div>
                          <strong>{c.name}</strong>
                          <small className={styles.muted}>{c.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span>{c.phone || '—'}</span>
                      {c.address && (
                        <div className={[styles.address, styles.muted].join(' ')}>
                          <IconMapPin size={13} />
                          <small>{c.address}</small>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={styles['items-chip']}>{c.orders_count} pedido{c.orders_count !== 1 ? 's' : ''}</span>
                    </td>
                    <td className={styles.total}>{formatPrice(c.total_spent)}</td>
                    <td>{formatDate(c.last_order_at)}</td>
                    <td className={styles.muted}>{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
