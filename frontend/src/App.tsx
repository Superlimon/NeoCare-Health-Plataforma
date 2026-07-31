import { useState, useEffect } from "react";
import axios from "axios";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

// --- Configuración de Axios para enviar Token JWT ---
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

// Interceptor: añade automáticamente el token a CADA petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [cargandoSesion, setCargandoSesion] = useState<boolean>(true);

  // 1. Al cargar la app, comprobar si ya hay sesión y token guardados
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userGuardado = localStorage.getItem("usuario");

    if (token && userGuardado) {
      try {
        const user = JSON.parse(userGuardado);
        setUserId(user.id);
        setUserEmail(user.email);
        setUserName(user.nombre);
        setIsLoggedIn(true);
      } catch (e) {
        console.error("Error leyendo datos del usuario guardado", e);
        localStorage.clear();
      }
    }
    setCargandoSesion(false);
  }, []);

  // 2. Manejo de Login y Registro
  const handleAuthSubmit = async (credentials: any, isRegistering: boolean) => {
    try {
      setErrorMessage("");

      if (isRegistering) {
        // --- REGISTRO DE USUARIO ---
        const response = await api.post("/creador_Usuarios", {
          nombre: credentials.nombre,
          email: credentials.email,
          password: credentials.password,
          rol: "usuario",
        });

        if (response.status === 200 || response.status === 201) {
          alert("¡Registro exitoso! Ahora puedes iniciar sesión.");
        }
      } else {
        // --- INICIO DE SESIÓN CON JWT ---
        const response = await api.post("/login", {
          email: credentials.email,
          password: credentials.password,
        });

        if (response.status === 200) {
          const { access_token, user } = response.data;

          // GUARDAMOS EL TOKEN Y DATOS DE USUARIO EN EL NAVEGADOR
          localStorage.setItem("token", access_token);
          localStorage.setItem("usuario", JSON.stringify(user));

          // ACTUALIZAMOS ESTADOS LOCALES
          setUserEmail(user.email);
          setUserName(user.nombre);
          setUserId(user.id);
          setIsLoggedIn(true);
        }
      }
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.detail) {
        setErrorMessage(error.response.data.detail);
      } else {
        setErrorMessage("Error de conexión con el servidor backend.");
      }
    }
  };

  // 3. Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setIsLoggedIn(false);
    setUserEmail("");
    setUserName("");
    setUserId(null);
  };

  if (cargandoSesion) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Cargando sesión...
      </div>
    );
  }

  return (
    <div style={{ margin: 0, padding: 0, fontFamily: "Arial, sans-serif" }}>
      {isLoggedIn && userId ? (
        <Dashboard
          userEmail={userEmail}
          userName={userName}
          userId={userId}
          onLogout={handleLogout}
        />
      ) : (
        <div>
          {errorMessage && (
            <div
              style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: "10px",
                textAlign: "center",
                maxWidth: "340px",
                margin: "20px auto 0 auto",
                borderRadius: "6px",
                border: "1px solid #f5c6cb",
              }}
            >
              {errorMessage}
            </div>
          )}
          <Login onLogin={handleAuthSubmit} />
        </div>
      )}
    </div>
  );
}
