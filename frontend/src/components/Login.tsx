import { useState } from "react";
import type { FormEvent } from "react";

interface LoginProps {
  onLogin: (credentials: any, isRegistering: boolean) => Promise<void> | void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [nombre, setNombre] = useState<string>(""); 
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const payload = isRegistering 
      ? { email, password, nombre } 
      : { email, password };

    console.log(`Datos (${isRegistering ? "Registro" : "Login"}):`, payload);
    onLogin(payload, isRegistering);
  };

  return (
    <div style={{ maxWidth: "340px", margin: "80px auto", padding: "24px", border: "1px solid #e2e8f0", borderRadius: "10px", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", backgroundColor: "#fff" }}>
      <h2 style={{ marginTop: 0, color: "#0f172a" }}>
        {isRegistering ? "Crear una Cuenta" : "Iniciar Sesión"}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {isRegistering && (
          <input 
            type="text" 
            placeholder="Nombre completo" 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)} 
            required 
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem" }}
          />
        )}

        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem" }}
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem" }}
        />

        <button 
          type="submit" 
          style={{ 
            padding: "10px", 
            backgroundColor: isRegistering ? "#16a34a" : "#007bff", 
            color: "white", 
            border: "none", 
            borderRadius: "6px", 
            cursor: "pointer", 
            fontWeight: "bold",
            fontSize: "0.95rem"
          }}
        >
          {isRegistering ? "Registrarse" : "Entrar"}
        </button>
      </form>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

      <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
        {isRegistering ? "¿Ya tienes cuenta?" : "¿No tienes cuenta todavía?"}
      </div>
      <button 
        type="button" 
        onClick={() => setIsRegistering(!isRegistering)}
        style={{ 
          marginTop: "8px",
          padding: "8px 12px", 
          backgroundColor: "transparent", 
          color: "#4f46e5", 
          border: "1px solid #4f46e5", 
          borderRadius: "6px", 
          cursor: "pointer", 
          fontWeight: "600",
          fontSize: "0.85rem",
          width: "100%"
        }}
      >
        {isRegistering ? "Volver a Iniciar Sesión" : "Crear Cuenta"}
      </button>
    </div>
  );
}
