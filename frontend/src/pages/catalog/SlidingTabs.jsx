import { useLayoutEffect, useRef } from 'react';

// Tabs o chips con indicador deslizante que se mueve con transform (sin setState en efectos)
export default function SlidingTabs({
  items,
  activeValue,
  onSelect,
  containerClassName,
  pillClassName,
  itemClassName,
  activeItemClassName,
  renderItem,
  ariaLabel,
}) {
  const containerRef = useRef(null);
  const pillRef = useRef(null);
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return undefined;

    const positionPill = (immediate = false) => {
      const activeEl = container.querySelector('[data-active="true"]');
      if (!activeEl) {
        pill.style.opacity = '0';
        return;
      }

      if (immediate) pill.style.transition = 'none';
      pill.style.width = `${activeEl.offsetWidth}px`;
      pill.style.height = `${activeEl.offsetHeight}px`;
      pill.style.transform = `translate3d(${activeEl.offsetLeft}px, ${activeEl.offsetTop}px, 0)`;
      pill.style.opacity = '1';

      if (immediate) {
        // Fuerza el cálculo inicial sin transición para evitar un salto desde (0, 0)
        void pill.offsetHeight;
        pill.style.transition = '';
      }
    };

    positionPill(!initializedRef.current);
    initializedRef.current = true;

    const handleResize = () => positionPill(true);
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      observer.observe(container);
    }
    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [activeValue, items]);

  return (
    <div ref={containerRef} className={containerClassName} role="tablist" aria-label={ariaLabel}>
      <span ref={pillRef} className={pillClassName} aria-hidden="true" />
      {items.map((item) => {
        const isActive = item.value === activeValue;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-active={isActive ? 'true' : undefined}
            className={[itemClassName, isActive ? activeItemClassName : ''].filter(Boolean).join(' ')}
            onClick={() => onSelect(item.value)}
          >
            {renderItem ? renderItem(item, isActive) : item.label}
          </button>
        );
      })}
    </div>
  );
}
