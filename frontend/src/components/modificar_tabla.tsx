import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ModificarTablasProps {
  isOpen: boolean;
  onClose: () => void;
  tablaSeleccionada: { id: string; nombre: string; endpointSingular: string };
  registroEditar: Record<string, any> | null;
  onRegistroActualizado: () => void;
}

export default function ModificarTablas({
  isOpen,
  onClose,
  tablaSeleccionada,
  registroEditar,
  onRegistroActualizado,
}: ModificarTablasProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    if (registroEditar) {
      setFormData({ ...registroEditar });
    }
    setErrorDetails(null);
  }, [registroEditar, isOpen]);

  if (!isOpen || !registroEditar) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorDetails(null);

    // Creamos una copia limpia del formulario
    const payload = { ...formData };

    // Eliminamos el 'id' del cuerpo del JSON para evitar conflictos
    delete payload.id;

    // Aseguramos conversión de números según la tabla activa
    if (tablaSeleccionada.id === 'tableros' && payload.creador_id) {
      payload.creador_id = Number(payload.creador_id);
    } else if (tablaSeleccionada.id === 'listas' && payload.tablero_id) {
      payload.tablero_id = Number(payload.tablero_id);
      payload.numero = Number(payload.numero);
    } else if (tablaSeleccionada.id === 'tarjetas') {
      if (payload.lista_id) payload.lista_id = Number(payload.lista_id);
      if (payload.asignado_a) payload.asignado_a = Number(payload.asignado_a);
    } else if (tablaSeleccionada.id === 'registro_trabajo') {
      if (payload.lista_id) payload.lista_id = Number(payload.lista_id);
      if (payload.usuario_id) payload.usuario_id = Number(payload.usuario_id);
      if (payload.horas_dedicadas) payload.horas_dedicadas = Number(payload.horas_dedicadas);
    }

    try {
      await axios.put(`${BASE_URL}/${tablaSeleccionada.id}/${registroEditar.id}`, payload);
      onRegistroActualizado();
      onClose();
    } catch (err: any) {
      console.error('--- DETALLE DEL ERROR 422 FASTAPI ---', err.response?.data);

      // Si FastAPI devuelve un error de validación 422, formateamos cada campo fallido
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          const mensajes = detail.map((item: any) => {
            const campo = item.loc ? item.loc.join(' ➔ ') : 'Campo';
            return `• Campo [${campo}]: ${item.msg}`;
          });
          setErrorDetails(mensajes.join('\n'));
        } else if (typeof detail === 'string') {
          setErrorDetails(detail);
        } else {
          setErrorDetails(JSON.stringify(detail));
        }
      } else {
        setErrorDetails('Error de conexión o problema desconocido en el servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>Modificar {tablaSeleccionada.endpointSingular} (ID #{registroEditar.id})</h3>
          <button onClick={onClose} style={styles.btnClose}>&times;</button>
        </div>

        {errorDetails && (
          <div style={styles.errorBox}>
            <strong>Campos rechazados por la API (422):</strong>
            <pre style={styles.preError}>{errorDetails}</pre>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tablaSeleccionada.id === 'tableros' && (
            <>
              <label style={styles.label}>Título</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo || ''}
                onChange={handleChange}
                required
                style={styles.input}
              />

              <label style={styles.label}>Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion || ''}
                onChange={handleChange}
                style={styles.input}
              />

              <label style={styles.label}>Estado</label>
              <select name="estado" value={formData.estado || 'Activo'} onChange={handleChange} style={styles.input}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Archivado">Archivado</option>
              </select>

              <label style={styles.label}>Creador ID</label>
              <input
                type="number"
                name="creador_id"
                value={formData.creador_id || ''}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </>
          )}

          {tablaSeleccionada.id === 'listas' && (
            <>
              <label style={styles.label}>Título de la Lista</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo || ''}
                onChange={handleChange}
                required
                style={styles.input}
              />

              <label style={styles.label}>Número de Orden</label>
              <input
                type="number"
                name="numero"
                value={formData.numero || 1}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </>
          )}

          {tablaSeleccionada.id === 'tarjetas' && (
            <>
              <label style={styles.label}>Título</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo || ''}
                onChange={handleChange}
                required
                style={styles.input}
              />

              <label style={styles.label}>Descripción</label>
              <textarea
                name="descripcion"
                value={formData.descripcion || ''}
                onChange={handleChange}
                style={styles.input}
              />

              <label style={styles.label}>Prioridad</label>
              <select name="prioridad" value={formData.prioridad || 'Media'} onChange={handleChange} style={styles.input}>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </>
          )}

          {tablaSeleccionada.id === 'registro_trabajo' && (
            <>
              <label style={styles.label}>Horas Dedicadas</label>
              <input
                type="number"
                name="horas_dedicadas"
                value={formData.horas_dedicadas || 1}
                onChange={handleChange}
                required
                style={styles.input}
              />

              <label style={styles.label}>Descripción de la Tarea</label>
              <textarea
                name="descripcion_tarea"
                value={formData.descripcion_tarea || ''}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </>
          )}

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.btnCancelar}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={styles.btnGuardar}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '450px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  btnClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginTop: '10px',
  },
  input: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    marginTop: '4px',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  btnGuardar: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  btnCancelar: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    marginBottom: '16px',
    fontSize: '0.85rem',
  },
  preError: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: '8px 0 0 0',
    fontSize: '0.8rem',
    color: '#7f1d1d',
  },
};