import styles from './Auth.module.css';

// Emojis de mercado distribuidos alrededor de la tarjeta (posiciones y ritmos en Auth.module.css)
const FLOATING_EMOJIS = [
  { emoji: '🥑', className: styles['bg-emoji-1'] },
  { emoji: '🍎', className: styles['bg-emoji-2'] },
  { emoji: '🥦', className: styles['bg-emoji-3'] },
  { emoji: '🥕', className: styles['bg-emoji-4'] },
  { emoji: '🍋', className: styles['bg-emoji-5'] },
  { emoji: '🥖', className: styles['bg-emoji-6'] },
  { emoji: '🧀', className: styles['bg-emoji-7'] },
  { emoji: '🍇', className: styles['bg-emoji-8'] },
  { emoji: '🍅', className: styles['bg-emoji-9'] },
  { emoji: '🥬', className: styles['bg-emoji-10'] },
];

/** Fondo decorativo compartido entre Login y Registro: blobs suaves y emojis flotando. */
export default function AuthBackground() {
  return (
    <div className={styles['auth-bg']} aria-hidden="true">
      <div className={`${styles['bg-blob']} ${styles['bg-blob-1']}`} />
      <div className={`${styles['bg-blob']} ${styles['bg-blob-2']}`} />
      {FLOATING_EMOJIS.map((item, idx) => (
        <span key={idx} className={`${styles['bg-emoji']} ${item.className}`}>
          {item.emoji}
        </span>
      ))}
    </div>
  );
}
