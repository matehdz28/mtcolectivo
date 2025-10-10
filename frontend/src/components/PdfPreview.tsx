import { useEffect } from "react";
import "./PdfPreview.scss";

type PdfPreviewProps = {
  open: boolean;
  url?: string;           // blob url del pdf
  title?: string;
  onClose: () => void;
};

export default function PdfPreview({ open, url, title = "Vista previa", onClose }: PdfPreviewProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Sugerimos “zoom=page-width” para que no se vea gigante
  const src = url ? `${url}#zoom=page-width` : undefined;

  return (
    <div className="pdfpv-overlay" onClick={onClose} aria-hidden>
      <div className="pdfpv-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="pdfpv-header">
          <h3>{title}</h3>
          <button className="pdfpv-close" type="button" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        {src ? (
          <iframe className="pdfpv-frame" src={src} title="Vista previa PDF" />
        ) : (
          <div className="pdfpv-empty">Sin contenido</div>
        )}
      </div>
    </div>
  );
}