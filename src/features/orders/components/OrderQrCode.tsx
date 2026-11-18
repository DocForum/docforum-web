import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import styles from './OrderQrCode.module.css';

interface OrderQrCodeProps {
  /** The opaque signed order token to encode. */
  token: string;
  /** Canvas size in CSS pixels. Defaults to 280 for screen; overridden by
   *  print styles via the CSS Module. */
  size?: number;
  /** Extra class name — used by OrderDetailPage to swap to full-screen. */
  className?: string;
}

/** Renders an order token into a <canvas> QR code via the `qrcode` library.
 * Never encodes anything other than the raw token string (PRD §8.1.6 /
 * issue #25 constraint). */
export function OrderQrCode({ token, size = 280, className }: OrderQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(canvas, token, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1c1815',  // --color-text (prints well on white)
        light: '#ffffff',
      },
    }).catch((err: unknown) => {
      // Non-fatal: log only — the canvas will remain blank rather than
      // crashing the page.
      console.error('QR generation failed', err);
    });
  }, [token, size]);

  return (
    <canvas
      ref={canvasRef}
      className={[styles.canvas, className].filter(Boolean).join(' ')}
      aria-label="Order verification QR code"
      role="img"
    />
  );
}
