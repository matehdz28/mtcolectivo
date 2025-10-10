// src/components/Modal.tsx
import { useEffect, useRef, type ReactNode } from "react";
import "./Modal.scss";

export type ModalStatus = "loading" | "done" | "error";

type ModalProps = {
  open: boolean;
  status: ModalStatus;
  title?: string;
  message?: string;
  onClose?: () => void;
  autoCloseMs?: number;       // opcional (para "done"), no lo usaremos aquí
  children?: ReactNode;       // 👈 contenido custom (ej: preview PDF)
  actions?: ReactNode;        // 👈 acciones custom (ej: botón descargar)
};

export default function Modal({
  open,
  status,
  title,
  message,
  onClose,
  autoCloseMs,
  children,
  actions,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Autocierre (lo dejamos disponible)
  useEffect(() => {
    if (!open || status !== "done" || !autoCloseMs) return;
    const t = setTimeout(() => onClose?.(), autoCloseMs);
    return () => clearTimeout(t);
  }, [open, status, autoCloseMs, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} aria-hidden>
      <div
        className={`modal-card modal-card--${status}`}
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        onClick={(e) => e.stopPropagation()}
        ref={ref}
      >
        <div className="modal-icon" aria-hidden>
          {status === "loading" && <span className="spinner" />}
          {status === "done" && (
            <svg viewBox="0 0 24 24" className="ok">
              <path d="M20.285 6.709a1 1 0 0 0-1.414-1.418l-8.18 8.18-3.562-3.56a1 1 0 0 0-1.415 1.414l4.27 4.27a1 1 0 0 0 1.415 0l8.886-8.886Z" />
            </svg>
          )}
          {status === "error" && (
            <svg viewBox="0 0 24 24" className="err">
              <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z" />
            </svg>
          )}
        </div>

        <h3 className="modal-title">
          {title ??
            (status === "loading"
              ? "Procesando…"
              : status === "done"
              ? "¡Listo!"
              : "Ocurrió un problema")}
        </h3>

        {message && <p className="modal-message">{message}</p>}

        {/* 👇 Vista previa / contenido custom */}
        {children && <div className="modal-body">{children}</div>}

        <div className="modal-actions">
          {actions ? (
            actions
          ) : (
            status !== "loading" && (
              <button type="button" className="btn" onClick={onClose}>
                Cerrar
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}