import "./Sidebar.scss";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type SidebarProps = { onUploadClick?: () => void };

export default function Sidebar({ onUploadClick }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();                   // limpia token en contexto y localStorage
    navigate("/login", { replace: true }); // redirige y evita volver con "atrás"
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="logo">MT</span>
        <span className="title">Colectivo</span>
      </div>

      <nav className="menu">
        <button className="menu-item active" type="button" onClick={onUploadClick}>
          Subir Excel
        </button>
      </nav>

      <div className="spacer" />
      <button className="logout-btn" onClick={handleLogout}>
        <span>⎋</span> Salir
      </button>
      <div className="foot">v1.0.0</div>
    </aside>
  );
}