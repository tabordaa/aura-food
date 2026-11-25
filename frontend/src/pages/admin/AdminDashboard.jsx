import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconMapPin } from '../../components/Icons';
import AdminLayout from './AdminLayout';
import AnimatedNumber from './AnimatedNumber';
import Sparkline from './Sparkline';
import TableSkeleton from './TableSkeleton';

import { formatOrderId, formatPrice, initials, parseServerDate } from '../../utils/format';
import { adminService } from '../../services/admin.service';
import { orderService } from '../../services/order.service';
import styles from './Admin.module.css';

// Id incremental para re-disparar la animación del toast (evita Date.now() durante el render)
let toastSeq = 0;
const nextToastId = () => ++toastSeq;

const REFRESH_MS = 15000;
const PAGE_SIZE = 8;

const ORDER_SKELETON_COLS = [
  { width: 72, twoLines: true },
  { width: 130, avatar: true },
  { width: 150, twoLines: true },
  { width: 74 },
  { width: 102, pill: true },
  { width: 140, pill: true },
];

// Cómo ve el administrador cada estado del backend
const STATUS_META = {
  pendiente: { label: 'Pendiente',      tone: 'pending' },
  preparado: { label: 'En preparación', tone: 'progress' },
  asignado:  { label: 'En camino',      tone: 'progress' },
  entregado: { label: 'Entregado',      tone: 'done' },
  rechazado: { label: 'Rechazado',      tone: 'rejected' },
  cancelado: { label: 'Cancelado',      tone: 'rejected' },
};

const TABS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'preparado', label: 'En preparación' },
  { id: 'asignado',  label: 'En camino' },
  { id: 'entregado', label: 'Entregados' },
  { id: 'rechazado', label: 'Rechazados' },
  { id: 'cancelado', label: 'Cancelados' },
];

function timeAgo(date, now) {
  const minutes = Math.max(0, Math.round((now - date) / 60000));
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function describeItems(items) {
  const names = items.map(i => i.product_name || `Prod #${i.product_id}`);
  const units = items.reduce((acc, i) => acc + i.quantity, 0);
  return { names: names.join(', '), units };
}

// Quién lleva el pedido (o si todavía espera domiciliario)
function courierNote(order) {
  if (order.courier) return `🛵 ${order.courier.name}`;
  return order.status === 'preparado' ? 'Esperando domiciliario' : '—';
}

// Resume ventas válidas de los últimos 7 días a partir de los pedidos ya cargados
function buildSevenDayRevenue(orders) {
  if (!orders.length) return { values: [], hasData: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = Array(7).fill(0);

  for (const order of orders) {
    if (order.status === 'rechazado' || order.status === 'cancelado' || !order.created_at) continue;
    const created = parseServerDate(order.created_at);
    if (Number.isNaN(created.getTime())) continue;

    const day = new Date(created);
    day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - day) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      buckets[6 - diffDays] += Number(order.total_price) || 0;
    }
  }

  return { values: buckets, hasData: buckets.some(v => v > 0) };
}

// Aviso sonoro corto y discreto con Web Audio API (solo si el usuario ya interactuó)
function playOrderDing(live) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!live.audioCtx) live.audioCtx = new AudioCtx();
    const ctx = live.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.09);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Sin soporte de audio o bloqueado por políticas del navegador
  }
}

function emptyOrdersCopy({ online, hasOrders, tab, search }) {
  if (!online && !hasOrders) {
    return {
      emoji: '📡',
      title: 'Sin conexión con el servidor',
      desc: 'Revisa que el backend esté corriendo en el puerto 8000 e intenta actualizar.',
    };
  }
  if (search) {
    return {
      emoji: '🔍',
      title: 'No encontramos ese pedido',
      desc: `Ningún pedido coincide con "${search}". Prueba con otro número, cliente o dirección.`,
    };
  }
  if (tab === 'pendiente') {
    return {
      emoji: '🎉',
      title: '¡Todo al día!',
      desc: 'No hay pedidos pendientes por aceptar en este momento.',
    };
  }
  return {
    emoji: '🧾',
    title: 'No hay pedidos en esta sección',
    desc: 'Cuando cambien de estado aparecerán aquí automáticamente.',
  };
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tab, setTab] = useState('pendiente');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [confirmRejectId, setConfirmRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState(() => new Set());
  const [popAction, setPopAction] = useState(null);

  // Estado mutable para notificaciones en vivo entre polls sin provocar renders extra
  const liveRef = useRef({
    seenIds: null,
    unread: 0,
    baseTitle: '',
    interacted: false,
    audioCtx: null,
    timers: [],
  });

  // Guarda título inicial, detecta interacción para el ding y limpia alertas al recuperar foco
  useEffect(() => {
    const live = liveRef.current;
    live.baseTitle = document.title || 'Aura Food';

    const clearUnreadTitle = () => {
      if (live.unread === 0) return;
      live.unread = 0;
      document.title = live.baseTitle;
    };
    const onVisibility = () => {
      if (!document.hidden) clearUnreadTitle();
    };
    const onInteract = () => {
      live.interacted = true;
      clearUnreadTitle();
    };

    window.addEventListener('focus', clearUnreadTitle);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointerdown', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract);

    return () => {
      window.removeEventListener('focus', clearUnreadTitle);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      live.timers.forEach(clearTimeout);
      live.timers.length = 0;
      document.title = live.baseTitle;
      if (live.audioCtx) {
        live.audioCtx.close().catch(() => {});
        live.audioCtx = null;
      }
    };
  }, []);

  // Los setState ocurren en los callbacks de la promesa (cuando llega la respuesta), no al llamar la función
  const loadOrders = useCallback(() => Promise.all([orderService.getOrders(), adminService.getStats()])
    .then(([list, summary]) => {
      const live = liveRef.current;
      if (live.seenIds === null) {
        // Primera carga: solo registra los IDs existentes sin disparar alertas
        live.seenIds = new Set(list.map(o => o.id));
      } else {
        const incoming = list.filter(o => !live.seenIds.has(o.id));
        list.forEach(o => live.seenIds.add(o.id));

        if (incoming.length > 0) {
          const newest = incoming[0];
          const extra = incoming.length > 1 ? ` (+${incoming.length - 1})` : '';
          setToast({
            id: nextToastId(),
            type: 'success',
            text: `🛒 Nuevo pedido ${formatOrderId(newest.id)} · ${formatPrice(newest.total_price)}${extra}`,
          });

          const newIds = incoming.map(o => o.id);
          setHighlightedIds(prev => {
            const next = new Set(prev);
            newIds.forEach(id => next.add(id));
            return next;
          });
          const clearTimer = setTimeout(() => {
            setHighlightedIds(prev => {
              const next = new Set(prev);
              newIds.forEach(id => next.delete(id));
              return next;
            });
          }, 2600);
          live.timers.push(clearTimer);

          live.unread += incoming.length;
          document.title = `(${live.unread}) Nuevo pedido · Aura Food`;
          if (live.interacted) playOrderDing(live);
        }
      }

      setOrders(list);
      setStats(summary);
      setOnline(true);
      setLastUpdate(new Date());
    })
    .catch(() => setOnline(false))
    .finally(() => setLoading(false)), []);

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

  const triggerPop = (id, action) => {
    setPopAction({ id, action });
    const timer = setTimeout(() => setPopAction(null), 320);
    liveRef.current.timers.push(timer);
  };

  async function changeStatus(order, status) {
    const rejecting = status === 'rechazado';
    triggerPop(order.id, rejecting ? 'reject' : 'accept');
    setBusyId(order.id);
    try {
      const updated = rejecting
        ? await orderService.rejectOrder(order.id, rejectReason.trim())
        : await orderService.updateStatus(order.id, status);
      setOrders(list => list.map(o => (o.id === updated.id ? updated : o)));
      adminService.getStats().then(setStats).catch(() => {});
      setConfirmRejectId(null);
      setRejectReason('');
      setToast({
        id: nextToastId(),
        type: rejecting ? 'warning' : 'success',
        text: rejecting
          ? `Pedido ${formatOrderId(order.id)} rechazado: el cliente verá el motivo`
          : `Pedido ${formatOrderId(order.id)} aceptado: pasa a preparación`,
      });
    } catch (err) {
      setToast({
        id: nextToastId(),
        type: 'error',
        text: err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message,
      });
    } finally {
      setBusyId(null);
    }
  }

  const openReject = (orderId) => {
    triggerPop(orderId, 'reject');
    setConfirmRejectId(orderId);
    setRejectReason('');
  };

  const now = new Date();
  const counts = useMemo(() => {
    const c = { todos: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const sparkline = useMemo(() => buildSevenDayRevenue(orders), [orders]);

  // Los indicadores vienen del servidor (cubren todos los pedidos, no solo los cargados en la tabla)
  const byStatus = stats?.orders_by_status ?? counts;
  const totalOrders = stats?.total_orders ?? orders.length;
  const todayCount = stats?.today_orders ?? 0;
  const inProgress = (byStatus.preparado || 0) + (byStatus.asignado || 0);

  const term = search.trim().toLowerCase();
  const visible = orders.filter(o => {
    if (tab !== 'todos' && o.status !== tab) return false;
    if (!term) return true;
    return formatOrderId(o.id).includes(term)
      || String(o.id) === term
      || o.delivery_address.toLowerCase().includes(term)
      || (o.customer?.name ?? '').toLowerCase().includes(term)
      || describeItems(o.items).names.toLowerCase().includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectTab = (id) => { setTab(id); setPage(1); };

  return (
    <AdminLayout
      active="pedidos"
      pendingCount={byStatus.pendiente || 0}
      search={search}
      onSearch={value => { setSearch(value); setPage(1); }}
      searchPlaceholder="Buscar por # de pedido, cliente, dirección o producto…"
      online={online}
    >
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
              <p className={styles['kpi-value']}><AnimatedNumber value={byStatus.pendiente || 0} /><small> por aceptar</small></p>
              {byStatus.pendiente > 0
                ? <span className={[styles.chip, styles['chip-alert']].join(' ')}>● Atención requerida</span>
                : <span className={styles.chip}>Todo al día</span>}
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Ingresos de hoy</span><i>💵</i></div>
              <div className={styles['kpi-value-row']}>
                <p className={styles['kpi-value']}><AnimatedNumber value={stats?.today_revenue ?? 0} currency /></p>
                {sparkline.hasData && <Sparkline values={sparkline.values} />}
              </div>
              <span className={styles['kpi-foot']}>{todayCount} pedido{todayCount !== 1 ? 's' : ''} hoy · incluye domicilio</span>
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>En curso</span><i>🛵</i></div>
              <p className={styles['kpi-value']}><AnimatedNumber value={inProgress} /><small> en preparación o camino</small></p>
              <span className={styles['kpi-foot']}>{byStatus.preparado || 0} preparando • {byStatus.asignado || 0} en camino</span>
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Completados</span><i>✅</i></div>
              <p className={styles['kpi-value']}><AnimatedNumber value={byStatus.entregado || 0} /><small> de {totalOrders} totales</small></p>
              <span className={styles['kpi-foot']}>
                {totalOrders ? Math.round(((byStatus.entregado || 0) / totalOrders) * 100) : 0}% entregados
              </span>
            </div>
          </section>

          {/* Tabla */}
          <section className={styles.panel}>
            <div className={styles.tabs} role="tablist">
              {TABS.filter(t => !['rechazado', 'cancelado'].includes(t.id) || counts[t.id]).map(t => (
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

            <div className={styles['table-wrap']}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th className={styles['col-actions']}>Acciones</th>
                  </tr>
                </thead>
                <tbody
                  key={loading && orders.length === 0 ? 'loading' : `${tab}-${currentPage}-${term}`}
                  className={styles['tbody-fade']}
                  aria-busy={loading && orders.length === 0}
                >
                  {loading && orders.length === 0 ? (
                    <TableSkeleton columns={ORDER_SKELETON_COLS} rows={5} />
                  ) : pageOrders.length === 0 ? (
                    (() => {
                      const empty = emptyOrdersCopy({ online, hasOrders: orders.length > 0, tab, search: search.trim() });
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
                  ) : pageOrders.map(order => {
                    const meta = STATUS_META[order.status] ?? { label: order.status, tone: 'progress' };
                    const created = parseServerDate(order.created_at);
                    const { names, units } = describeItems(order.items);
                    const busy = busyId === order.id;
                    const isNew = highlightedIds.has(order.id);
                    const popAccept = popAction?.id === order.id && popAction.action === 'accept';
                    const popReject = popAction?.id === order.id && popAction.action === 'reject';
                    return (
                      <tr
                        key={order.id}
                        className={[busy ? styles.busy : '', isNew ? styles['row-new'] : ''].filter(Boolean).join(' ')}
                      >
                        <td>
                          <div className={styles['order-id']}>
                            <span className={[styles.dot, styles[`dot-${meta.tone}`]].join(' ')} />
                            <strong>{formatOrderId(order.id)}</strong>
                          </div>
                          <small className={styles.muted}>{timeAgo(created, now)}</small>
                        </td>
                        <td>
                          {/* La dirección va debajo del cliente para que la tabla quepa sin scroll en portátiles */}
                          <div className={styles.client}>
                            <span className={styles['client-avatar']}>{initials(order.customer?.name)}</span>
                            <div>
                              <strong>{order.customer?.name ?? `Cliente #${order.user_id}`}</strong>
                              <div className={[styles.address, styles.muted].join(' ')}>
                                <IconMapPin size={13} />
                                <span>{order.delivery_address}</span>
                              </div>
                            </div>
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
                            <span className={styles.muted}>{courierNote(order)}</span>
                          ) : confirmRejectId === order.id ? (
                            <form
                              className={styles.confirm}
                              onSubmit={e => { e.preventDefault(); if (rejectReason.trim().length >= 3) changeStatus(order, 'rechazado'); }}
                            >
                              <input
                                className={styles['reason-input']}
                                placeholder="Motivo (lo verá el cliente)"
                                aria-label="Motivo del rechazo"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                maxLength={300}
                                disabled={busy}
                                autoFocus
                              />
                              <button
                                type="submit"
                                className={[styles['btn-danger'], popReject ? styles['btn-pop'] : ''].filter(Boolean).join(' ')}
                                disabled={busy || rejectReason.trim().length < 3}
                              >
                                {busy ? '…' : 'Rechazar'}
                              </button>
                              <button type="button" className={styles['btn-ghost']} onClick={() => setConfirmRejectId(null)} disabled={busy}>No</button>
                            </form>
                          ) : (
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={[styles['btn-accept'], popAccept ? styles['btn-pop'] : ''].filter(Boolean).join(' ')}
                                onClick={() => changeStatus(order, 'preparado')}
                                disabled={busy}
                              >
                                {busy ? '…' : <><IconCheck size={13} /> Aceptar</>}
                              </button>
                              <button
                                type="button"
                                className={[styles['btn-reject'], popReject ? styles['btn-pop'] : ''].filter(Boolean).join(' ')}
                                onClick={() => openReject(order.id)}
                                disabled={busy}
                              >
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
            </div>

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

      {toast && (
        <div key={toast.id} className={[styles.toast, styles[`toast-${toast.type}`]].join(' ')} role="status">
          {toast.text}
        </div>
      )}
    </AdminLayout>
  );
}
