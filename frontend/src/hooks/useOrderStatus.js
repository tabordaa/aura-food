import { useEffect, useState } from 'react';
import { fetchOrder } from '../utils/orders';

const POLL_MS = 8000;

// Consulta el pedido y lo vuelve a consultar cada pocos segundos hasta que se entregue
export default function useOrderStatus(id) {
  const [state, setState] = useState({ order: null, loading: Boolean(id), notFound: false, error: '', updatedAt: null });

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    let timer;

    async function load() {
      try {
        const order = await fetchOrder(id);
        if (cancelled) return;
        setState({ order, loading: false, notFound: order === null, error: '', updatedAt: new Date() });
        if (order && order.status !== 'entregado') timer = setTimeout(load, POLL_MS);
      } catch {
        if (cancelled) return;
        setState(s => ({ ...s, loading: false, error: 'Sin conexión con el servidor. Reintentando…' }));
        timer = setTimeout(load, POLL_MS);
      }
    }

    setState(s => ({ ...s, loading: true }));
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return state;
}
