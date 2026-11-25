import useCountUp from '../../hooks/useCountUp';
import { formatPrice } from '../../utils/format';

// Muestra un entero o valor monetario animado desde 0 con useCountUp
export default function AnimatedNumber({ value, currency = false, duration = 850 }) {
  const animated = useCountUp(value, duration);
  const rounded = Math.round(animated);
  return currency ? formatPrice(rounded) : rounded.toLocaleString('es-CO');
}
