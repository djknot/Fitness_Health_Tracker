import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { FoodRecord } from '../../types';
import { lookupBarcode } from '../../lib/foodSearch';
import { Button, Field, IconButton, TextInput } from '../ui';

type LookupStatus = 'idle' | 'looking' | 'notfound' | 'error';
type CameraState = 'starting' | 'on' | 'stopped' | 'unavailable';

/**
 * Barcode lookup modal. Manual code entry always works; when a camera is
 * available, a live preview scans retail barcodes as progressive enhancement.
 * Render only while open — mounting starts the camera, unmounting (or closing)
 * stops every media track and clears the detect interval.
 */
export function BarcodeScanner({
  onFound,
  onClose,
}: {
  /** Called with the matched product; the caller closes the modal and prefills its form. */
  onFound: (food: FoodRecord) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lookupCtrlRef = useRef<AbortController | null>(null);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<LookupStatus>('idle');
  const [camera, setCamera] = useState<CameraState>('starting');

  const stopCamera = () => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const lookup = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    lookupCtrlRef.current?.abort();
    const ctrl = new AbortController();
    lookupCtrlRef.current = ctrl;
    setStatus('looking');
    try {
      const food = await lookupBarcode(value, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (food) {
        onFound(food);
      } else {
        setStatus('notfound');
      }
    } catch {
      if (!ctrl.signal.aborted) setStatus('error');
    }
  };

  // Latest-callback refs so the camera interval and the key handler never go stale.
  const lookupRef = useRef(lookup);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    lookupRef.current = lookup;
    onCloseRef.current = onClose;
  });

  // Escape closes the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Camera path: lazy-load the detector ponyfill, then poll frames ~every 300 ms.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { BarcodeDetector } = await import('barcode-detector/ponyfill');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera unsupported');
        const detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        setCamera('on');

        let busy = false;
        let found = false;
        intervalRef.current = window.setInterval(async () => {
          const v = videoRef.current;
          if (busy || found || !v || v.readyState < 2) return;
          busy = true;
          try {
            const hits = await detector.detect(v);
            const raw = hits[0]?.rawValue.trim();
            if (raw && !found) {
              found = true;
              stopCamera();
              setCamera('stopped');
              setCode(raw);
              void lookupRef.current(raw);
            }
          } catch {
            // Frame not decodable yet — keep scanning.
          } finally {
            busy = false;
          }
        }, 300);
      } catch {
        if (!cancelled) {
          stopCamera();
          setCamera('unavailable');
        }
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
      lookupCtrlRef.current?.abort();
    };
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void lookup(code);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-scanner-title"
        className="w-full max-w-md rounded-2xl border border-edge bg-surface p-4 shadow-lg sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 id="barcode-scanner-title" className="text-sm font-semibold text-ink">
            Scan barcode
          </h2>
          <IconButton variant="neutral" label="Close scanner" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>

        {camera === 'unavailable' ? (
          <p className="rounded-xl bg-page px-3 py-2 text-xs text-muted">
            Camera unavailable — enter the code manually.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-page">
            {camera !== 'stopped' && (
              <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
            )}
            <p className="px-3 py-1.5 text-[11px] text-muted">
              {camera === 'on'
                ? 'Point the camera at the product barcode.'
                : camera === 'stopped'
                  ? 'Barcode detected — camera stopped.'
                  : 'Starting camera…'}
            </p>
          </div>
        )}

        <form className="mt-3" onSubmit={onSubmit}>
          <div className="flex items-end gap-2">
            <Field label="Barcode number" className="flex-1">
              <TextInput
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (status !== 'idle' && status !== 'looking') setStatus('idle');
                }}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 737628064502"
                autoFocus
              />
            </Field>
            <Button type="submit" disabled={code.trim() === '' || status === 'looking'}>
              Look up
            </Button>
          </div>
          {status === 'looking' && <p className="mt-2 text-xs text-muted">Looking up product…</p>}
          {status === 'notfound' && (
            <p className="mt-2 text-xs text-muted">No product found for this barcode.</p>
          )}
          {status === 'error' && (
            <p className="mt-2 text-xs text-muted">
              Couldn't reach the food database — check your connection and try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
