// src/pages/Dashboard.tsx
// …tus imports tal cual
import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Modal, { type ModalStatus } from "../components/Modal";
import PdfPreview from "../components/PdfPreview";
import { uploadExcel, ApiError } from "../services/api";
import OrderEditor from "../components/OrderEditor";
import {
  deleteOrder,
  fetchOrders,
  pdfFromData,
  type Order,
} from "../services/orders";
import "./Dashboard.scss";
import { DownloadIcon, EyeIcon, TrashIcon } from "../components/Icons";
import { useAuth } from "../contexts/AuthContext";


type ApiState = "idle" | "loading" | "done" | "error";

const fmtMoney = (n: number | null) =>
  n === null
    ? "-"
    : n.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      });

export default function Dashboard() {
  const { isAuth } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Abre el modal de edición
  function openEditor(order: any) {
    setEditingOrder(order);
    setEditorOpen(true);
  }

  // Cerrar editor
  function closeEditor() {
    setEditorOpen(false);
    setEditingOrder(null);
  }

  // 👇 NUEVO: key para forzar remount del input tras cada uso
  const [inputKey, setInputKey] = useState(0);

  const [status, setStatus] = useState<ApiState>("idle");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<ModalStatus>("loading");
  const [modalTitle, setModalTitle] = useState("Procesando…");
  const [modalMsg, setModalMsg] = useState(
    "Estamos generando tu PDF. Esto puede tardar unos segundos."
  );

  const [uploadPdfUrl, setUploadPdfUrl] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  const openPicker = () => {
    if (!isAuth) {
      setModalStatus("error");
      setModalTitle("Sesión requerida");
      setModalMsg("Inicia sesión para subir un Excel.");
      setModalOpen(true);
      return;
    }
    fileRef.current?.click();
  };

  useEffect(() => {
    if (!isAuth) return;
    const ac = new AbortController();
    (async () => {
      setLoadingOrders(true);
      try {
        const data = await fetchOrders(ac.signal);
        setOrders(data);
      } finally {
        setLoadingOrders(false);
      }
    })();
    return () => ac.abort();
  }, [isAuth]);

  useEffect(() => {
    return () => {
      if (uploadPdfUrl) URL.revokeObjectURL(uploadPdfUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [uploadPdfUrl, previewUrl]);

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    console.log("[uploader] change fired. file:", file?.name);
    if (!file) return;

    if (!isAuth) {
      setModalStatus("error");
      setModalTitle("Sesión requerida");
      setModalMsg("Inicia sesión para subir un Excel.");
      setModalOpen(true);
      return;
    }

    const ac = new AbortController();
    try {
      setStatus("loading");
      setMessage("Procesando…");

      setModalStatus("loading");
      setModalTitle("Procesando…");
      setModalMsg("Estamos generando tu PDF. Esto puede tardar unos segundos.");
      setModalOpen(true);

      const pdfBlob = await uploadExcel(file, "Sheet1", ac.signal);
      const url = URL.createObjectURL(pdfBlob);

      if (uploadPdfUrl) URL.revokeObjectURL(uploadPdfUrl);
      setUploadPdfUrl(url);

      setStatus("done");
      setMessage("PDF generado correctamente.");
      setModalStatus("done");
      setModalTitle("Vista previa");
      setModalMsg("Revisa el PDF. Puedes descargarlo si todo luce bien.");

      const data = await fetchOrders(ac.signal);
      setOrders(data);
    } catch (err) {
      const apiErr = err as ApiError;
      const msg =
        apiErr?.status === 401
          ? "Sesión expirada. Vuelve a iniciar sesión."
          : apiErr?.message || "Error al generar PDF";

      setStatus("error");
      setMessage(msg);
      setModalStatus("error");
      setModalTitle(
        apiErr?.status === 401 ? "Sesión expirada" : "Ocurrió un problema"
      );
      setModalMsg(msg);
    } finally {
      // 👇 Fuerza remount del input para que el próximo change SIEMPRE dispare
      setInputKey((k) => k + 1);
    }
  };

  const openPreview = async (order: Order) => {
    if (!isAuth) return;
    const ac = new AbortController();
    setModalStatus("loading");
    setModalTitle("Abriendo vista previa…");
    setModalMsg("Preparando el documento.");
    setModalOpen(true);

    try {
      const pdf = await pdfFromData(order, ac.signal);
      const url = URL.createObjectURL(pdf);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setPreviewOpen(true);
      setModalOpen(false);
    } catch (e: any) {
      setModalStatus("error");
      setModalTitle(
        e?.status === 401
          ? "Sesión expirada"
          : "No se pudo abrir la vista previa"
      );
      setModalMsg(
        e?.status === 401
          ? "Vuelve a iniciar sesión."
          : e?.message || "Error desconocido"
      );
      setModalOpen(true);
    }
  };

  const downloadFromOrder = async (order: Order) => {
    if (!isAuth) return;
    const ac = new AbortController();
    setModalStatus("loading");
    setModalTitle("Generando PDF…");
    setModalMsg("Un momento por favor.");
    setModalOpen(true);
    try {
      const pdf = await pdfFromData(order, ac.signal);
      const url = URL.createObjectURL(pdf);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orden_${order.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setModalStatus("done");
      setModalTitle("¡Listo!");
      setModalMsg("Tu PDF se descargó correctamente.");
      setTimeout(() => setModalOpen(false), 1000);
    } catch (e: any) {
      setModalStatus("error");
      setModalTitle(
        e?.status === 401 ? "Sesión expirada" : "No se pudo descargar"
      );
      setModalMsg(
        e?.status === 401
          ? "Vuelve a iniciar sesión."
          : e?.message || "Error desconocido"
      );
    }
  };

  const removeOrder = async (o: Order) => {
    if (!isAuth) return;
    if (!confirm(`¿Eliminar la orden #${o.id}?`)) return;
    const ac = new AbortController();
    try {
      await deleteOrder(o.id, ac.signal);
      setOrders((prev) => prev.filter((x) => x.id !== o.id));
    } catch (e: any) {
      setModalStatus("error");
      setModalTitle(
        e?.status === 401 ? "Sesión expirada" : "No se pudo eliminar"
      );
      setModalMsg(
        e?.status === 401
          ? "Vuelve a iniciar sesión."
          : e?.message || "Error desconocido"
      );
      setModalOpen(true);
    }
  };

  const handleCloseStateModal = () => setModalOpen(false);
  const downloadUploadedPdf = () => {
    if (!uploadPdfUrl) return;
    const a = document.createElement("a");
    a.href = uploadPdfUrl;
    a.download = "orden.pdf";
    a.click();
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="dashboard">
      <Sidebar onUploadClick={openPicker} />

      <main className="content">
        <header className="content-header">
          <h2>Generador de Órdenes</h2>
          <p>Sube tu archivo Excel o revisa las órdenes existentes.</p>
        </header>

        <section className="uploader">
          <div className="drop-card">
            {/* 👇 clave para remount */}
            <input
              key={inputKey}
              id="excel-file"
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="file-input-overlay"
              onChange={onInputChange}
              aria-label="Seleccionar archivo Excel"
            />
            <div className="big-icon" aria-hidden>
              📄
            </div>
            <h3>Selecciona o arrastra tu Excel</h3>
            <p>Formatos permitidos: .xlsx, .xls</p>
            <label htmlFor="excel-file" className="btn-primary as-label">
              Elegir archivo
            </label>
          </div>

          <div className={`status status--${status}`}>
            {status === "loading" && <span>Procesando…</span>}
            {status === "done" && <span>¡Listo! {message}</span>}
            {status === "error" && <span>Ups: {message}</span>}
          </div>
        </section>
        {/* ===== ÓRDENES: Tabla Pro ===== */}
        <section className="orders-pro">
          <h3>Órdenes recientes</h3>

          {/* Encabezado fijo */}
          <div className="orders-pro__head">
            <div className="col col--cliente">Cliente</div>
            <div className="col col--total">Total</div>
            <div className="col col--fecha">Fecha</div>
            <div className="col col--hora">Hora</div>
            <div className="col col--acciones">Acciones</div>
          </div>

          {/* Área scrolleable */}
          <div className="orders-pro__body">
            {loadingOrders && (
              <div className="orders-pro__empty">Cargando…</div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="orders-pro__empty">Aún no hay órdenes.</div>
            )}

            {orders.map((o, idx) => (
              <div
                key={o.id}
                className={`orders-pro__row ${idx % 2 ? "is-alt" : ""}`}
              >
                <div
                  className="cell cell--cliente"
                  onClick={() => openPreview(o)}
                >
                  <div className="name">{o.nombre || "Sin nombre"}</div>
                  <div className="sub">#{o.id}</div>
                </div>

                <div className="cell cell--total">
                  <span className="money">{fmtMoney(o.total)}</span>
                </div>

                <div className="cell cell--fecha">{fmtDate(o.created_at)}</div>

                <div className="cell cell--hora">
                  {new Date(o.created_at).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                <div className="cell cell--acciones">
                  <button
                    className="icon-chip"
                    onClick={() => openPreview(o)}
                    aria-label="Vista previa"
                  >
                    <EyeIcon size="1.1rem" />
                  </button>
                  <button
                    className="icon-chip"
                    onClick={() => openEditor(o)}
                    aria-label="Editar orden"
                  >
                    <EyeIcon size="1.1rem" />
                  </button>
                  <button
                    className="icon-chip"
                    onClick={() => downloadFromOrder(o)}
                    aria-label="Descargar PDF"
                  >
                    <DownloadIcon size="1.1rem" />
                  </button>
                  <button
                    className="icon-chip danger"
                    onClick={() => removeOrder(o)}
                    aria-label="Eliminar orden"
                  >
                    <TrashIcon size="1.1rem" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Modal
        open={modalOpen}
        status={modalStatus}
        title={modalTitle}
        message={modalMsg}
        onClose={handleCloseStateModal}
        children={
          modalStatus === "done" && uploadPdfUrl ? (
            <div className="pdf-preview">
              <iframe
                className="pdf-embed"
                src={uploadPdfUrl}
                title="Vista previa PDF"
                style={{ width: "100%", height: "100%", border: 0 }}
              />
            </div>
          ) : undefined
        }
        actions={
          modalStatus === "done" && uploadPdfUrl ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={handleCloseStateModal}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={downloadUploadedPdf}
              >
                Descargar
              </button>
            </>
          ) : modalStatus !== "loading" ? (
            <button
              type="button"
              className="btn"
              onClick={handleCloseStateModal}
            >
              Cerrar
            </button>
          ) : undefined
        }
      />

      <PdfPreview
        open={previewOpen}
        url={previewUrl}
        title="Vista previa"
        onClose={() => {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(undefined);
          setPreviewOpen(false);
        }}
      />
      <OrderEditor
        open={editorOpen}
        order={editingOrder}
        onClose={() => setEditorOpen(false)}
        onSaved={loadingOrders}
      />
    </div>
  );
}
