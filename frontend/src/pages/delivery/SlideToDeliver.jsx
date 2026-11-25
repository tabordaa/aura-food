import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCheck, IconTruck } from '../../components/Icons';
import { prefersReducedMotion } from '../../utils/motion';
import styles from './Delivery.module.css';

// Umbral mínimo de arrastre para confirmar la entrega
const CONFIRM_THRESHOLD = 0.85;
// Al llegar casi al extremo se confirma de inmediato sin esperar a soltar
const AUTO_CONFIRM_THRESHOLD = 0.96;
const TRACK_PADDING = 4;
const CONFIRM_DELAY_MS = 380;

export default function SlideToDeliver({ onDeliver, disabled = false, orderLabel = '' }) {
  const reducedMotion = prefersReducedMotion();
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const dragRef = useRef({ active: false, pointerId: null, startX: 0, maxDrag: 0 });

  const [offset, setOffset] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getMaxDrag = useCallback(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return 0;
    return Math.max(0, track.clientWidth - thumb.offsetWidth - TRACK_PADDING * 2);
  }, []);

  const resetSlider = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    setDragging(false);
    setOffset(0);
    setProgress(0);
    setConfirmed(false);
  }, []);

  const confirmDelivery = useCallback((knownMaxDrag) => {
    if (timerRef.current) return;
    const maxDrag = knownMaxDrag ?? getMaxDrag();
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    setDragging(false);
    setOffset(maxDrag);
    setProgress(1);
    setConfirmed(true);

    // Se espera brevemente para mostrar la pista verde y el check con af-pop antes de enviar
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      const ok = await onDeliver();
      if (mountedRef.current && ok === false) {
        resetSlider();
      }
    }, CONFIRM_DELAY_MS);
  }, [getMaxDrag, onDeliver, resetSlider]);

  const handlePointerDown = (e) => {
    if (disabled || confirmed || e.button !== 0) return;
    const maxDrag = getMaxDrag();
    if (maxDrag <= 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX - offset,
      maxDrag,
    };
    setDragging(true);
  };

  const handlePointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const nextOffset = Math.max(0, Math.min(drag.maxDrag, e.clientX - drag.startX));
    const nextProgress = drag.maxDrag > 0 ? nextOffset / drag.maxDrag : 0;

    if (nextProgress >= AUTO_CONFIRM_THRESHOLD) {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      confirmDelivery(drag.maxDrag);
      return;
    }

    setOffset(nextOffset);
    setProgress(nextProgress);
  };

  const handlePointerEnd = (e) => {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const finalOffset = Math.max(0, Math.min(drag.maxDrag, e.clientX - drag.startX));
    const finalProgress = drag.maxDrag > 0 ? finalOffset / drag.maxDrag : 0;

    if (e.type === 'pointerup' && finalProgress >= CONFIRM_THRESHOLD) {
      confirmDelivery(drag.maxDrag);
      return;
    }

    drag.active = false;
    drag.pointerId = null;
    setDragging(false);
    setOffset(0);
    setProgress(0);
  };

  const handleKeyDown = (e) => {
    if (disabled || confirmed) return;

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'End') {
      e.preventDefault();
      confirmDelivery();
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const maxDrag = getMaxDrag();
      const nextProgress = Math.min(1, progress + 0.25);
      if (nextProgress >= CONFIRM_THRESHOLD) {
        confirmDelivery(maxDrag);
      } else {
        setProgress(nextProgress);
        setOffset(maxDrag * nextProgress);
      }
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'Home') {
      e.preventDefault();
      setProgress(0);
      setOffset(0);
    }
  };

  // Con movimiento reducido basta el botón directo para confirmar la entrega
  if (reducedMotion) {
    return (
      <button
        className={styles['deliver-button']}
        type="button"
        onClick={onDeliver}
        disabled={disabled}
      >
        <IconCheck size={17} />
        {disabled ? 'Actualizando...' : 'Marcar como entregado'}
      </button>
    );
  }

  const labelOpacity = confirmed ? 1 : Math.max(0, 1 - progress * 1.45);
  const trackClasses = [
    styles['slider-track'],
    confirmed ? styles['slider-confirmed'] : '',
    disabled && !confirmed ? styles['slider-disabled'] : '',
  ].filter(Boolean).join(' ');

  const fillClasses = [
    styles['slider-fill'],
    dragging ? styles['slider-no-transition'] : '',
  ].filter(Boolean).join(' ');

  const thumbClasses = [
    styles['slider-thumb'],
    dragging ? styles['slider-no-transition'] : '',
    confirmed ? styles['slider-thumb-confirmed'] : '',
  ].filter(Boolean).join(' ');

  const ariaLabel = orderLabel
    ? `Desliza para marcar como entregado el pedido ${orderLabel}`
    : 'Desliza para marcar como entregado';

  return (
    <div ref={trackRef} className={trackClasses}>
      <div
        className={fillClasses}
        style={{ transform: `scaleX(${confirmed ? 1 : progress})` }}
        aria-hidden="true"
      />

      <span
        className={`${styles['slider-label']} ${confirmed ? styles['slider-label-confirmed'] : ''}`}
        style={{ opacity: labelOpacity }}
        aria-hidden="true"
      >
        {confirmed ? '¡Entregado!' : 'Desliza para entregar →'}
      </span>

      <div
        ref={thumbRef}
        role="slider"
        tabIndex={disabled || confirmed ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={confirmed ? 'Entregado' : 'Desliza para entregar'}
        aria-disabled={disabled || confirmed}
        className={thumbClasses}
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
      >
        {confirmed ? (
          <span className={styles['slider-check']}>
            <IconCheck size={19} />
          </span>
        ) : (
          <IconTruck size={18} />
        )}
      </div>
    </div>
  );
}
