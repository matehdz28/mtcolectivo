import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.scss";
import { login, isLoggedIn } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useAuth(); // ⬅️ actualizamos el contexto tras login

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // si ya hay sesión, manda directo
  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pass || loading) return;
    setErr(null);
    setLoading(true);
    try {
      const token = await login({ username: user, password: pass });
      setToken(token); // ⬅️ avisa al contexto (sin refrescar)
      // redirección principal
      navigate("/dashboard", { replace: true });
      // fallback duro por si algo bloquea el navigate
      setTimeout(() => {
        if (window.location.pathname !== "/dashboard") {
          window.location.assign("/dashboard");
        }
      }, 50);
    } catch (error: any) {
      setErr(error?.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-image">
          <h2>¡Bienvenido<br />de vuelta!</h2>
        </div>

        <div className="login-card">
          <h1>Iniciar sesión</h1>
          <p>Bienvenido, por favor ingresa a tu cuenta.</p>

          <form className="inputs" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="user">Usuario</label>
              <input
                id="user"
                name="user"
                placeholder="tu.usuario"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="field">
              <label htmlFor="pass">Contraseña</label>
              <input
                id="pass"
                name="pass"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {err && <div className="login-error" role="alert">{err}</div>}

            <div className="actions">
              <button type="submit" disabled={loading || !user || !pass}>
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </div>
          </form>

          <p className="footer">© 2025 MT Colectivo</p>
        </div>
      </div>
    </div>
  );
}