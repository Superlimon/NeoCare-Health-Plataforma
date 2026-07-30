import React, { useState } from 'react';
// 🟢 Importamos la instancia autenticada desde la carpeta anterior
import { api } from '../App';

interface TablaInfo {
  id: string;
  nombre: string;
  endpointSingular: string;
}

interface BorrarTablaProps {
  isOpen: boolean;
  onClose: () => void;
  tablaSeleccionada: TablaInfo;
  registroAEliminar: { id: number; titulo?: string; [key: string]: any } | null;
  onRegistroEliminado: () => void;
}

export default function BorrarTabla({
  isOpen,
  onClose,
  tablaSeleccionada,
  registroAEliminar,
  onRegistroEliminado,
}: BorrarTablaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !registroAEliminar) return null;

  const handleConfirmarBorrado = async () => {
    setLoading(true);
    setError(null);

    try {
      // 🟢 Usamos 'api' en lugar de 'axios' para incluir el JWT Token automáticamente
      await api.delete(`/${tablaSeleccionada.id}/${registroAEliminar.id}`);
      
      onRegistroEliminado(); // Refresca la vista en el Dashboard
      onClose(); // Cierra el modal
    } catch (err: any) {
      console.error(`Error al eliminar en ${tablaSeleccionada.id}:`, err);
      setError(
        err.response?.data?.detail ||
          `No se pudo eliminar el registro de ${tablaSeleccionada.nombre}.`
      );
    } finally {
      setLoading(false);
    }
  };

  // Identifica el nombre o título del elemento para mostrarlo en la alerta
  const identificadorRegistro =
    registroAEliminar.titulo ||
    registroAEliminar.nombre ||
    `ID #${registroAEliminar.id}`;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ENCABEZADO DEL MODAL */}
        <div style={styles.header}>
          <h2 style={styles.title}>Confirmar Eliminación</h2>
          <button onClick={onClose} style={styles.btnClose}>
            &times;
          </button>
        </div>

        {/* MENSAJE DE ERROR SI OCURRE */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* CUERPO DEL MODAL */}
        <div style={styles.body}>
          <p style={styles.text}>
            ¿Estás seguro de que deseas eliminar este elemento?
          </p>
          <div style={styles.infoCard}>
            <p style={styles.infoText}>
              <strong>Tipo:</strong> {tablaSeleccionada.endpointSingular}
            </p>
            <p style={styles.infoText}>
              <strong>Elemento:</strong> {identificadorRegistro}
            </p>
          </div>
          <p style={styles.warningText}>
            Esta acción es permanente y no se podrá deshacer.
          </p>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div style={styles.footer}>
          <button
            onClick={onClose}
            disabled={loading}
            style={styles.btnCancelar}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmarBorrado}
            disabled={loading}
            style={styles.btnEliminar}
          >
            {loading ? 'Eliminando...' : 'Sí, Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b',
  },
  body: {
    padding: '24px',
  },
  text: {
    margin: '0 0 16px 0',
    color: '#334155',
    fontSize: '0.95rem',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  infoText: {
    margin: '4px 0',
    color: '#475569',
    fontSize: '0.9rem',
  },
  warningText: {
    margin: 0,
    color: '#dc2626',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  footer: {
    padding: '16px 24px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  btnCancelar: {
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  btnEliminar: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '12px 16px',
    margin: '16px 24px 0 24px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    fontSize: '0.85rem',
  },
};