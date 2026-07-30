import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TablaInfo {
  id: string;
  nombre: string;
  endpointSingular: string;
}

interface CrearTablasProps {
  isOpen: boolean;
  onClose: () => void;
  tablaSeleccionada: TablaInfo;
  userId: number;
  onRegistroCreado: () => void;
  registroEditar?: Record<string, any> | null; // Datos si se quiere editar
}

interface TableroOption {
  id: number;
  titulo: string;
}

interface ListaOption {
  id: number;
  titulo: string;
}

interface UsuarioOption {
  id: number;
  nombre: string;
}

export default function CrearTablas({
  isOpen,
  onClose,
  tablaSeleccionada,
  userId,
  onRegistroCreado,
  registroEditar = null,
}: CrearTablasProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<'crear' | 'editar'>('crear');

  const [tableros, setTableros] = useState<TableroOption[]>([]);
  const [listas, setListas] = useState<ListaOption[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);

  const BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    if (isOpen) {
      setError(null);

      if (registroEditar && registroEditar.id) {
        setModo('editar');
        setFormData({ ...registroEditar });
      } else {
        setModo('crear');
        setFormData({
          prioridad: 1,
          numero: 1,
          horas_dedicadas: 1,
        });
      }

      // Cargar opciones para los selects de FKs
      const fetchRelaciones = async () => {
        try {
          const [resTableros, resListas, resUsuarios] = await Promise.allSettled([
            axios.get(`${BASE_URL}/tableros`),
            axios.get(`${BASE_URL}/listas`),
            axios.get(`${BASE_URL}/usuarios`),
          ]);

          if (resTableros.status === 'fulfilled') setTableros(resTableros.value.data);
          if (resListas.status === 'fulfilled') setListas(resListas.value.data);
          if (resUsuarios.status === 'fulfilled') setUsuarios(resUsuarios.value.data);
        } catch (err) {
          console.error('Error al cargar relaciones:', err);
        }
      };

      fetchRelaciones();
    }
  }, [isOpen, tablaSeleccionada.id, registroEditar]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'number' || name.endsWith('_id') || name === 'asignado_a' || name === 'prioridad') {
      setFormData((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Guardar (Crear o Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, any> = { ...formData };

    // Inyección inamovible de FK del usuario actual
    switch (tablaSeleccionada.id) {
      case 'tableros':
        payload.creador_id = userId;
        break;
      case 'registro_trabajo':
        payload.usuario_id = userId;
        break;
    }

    try {
      if (modo === 'crear') {
        await axios.post(`${BASE_URL}/${tablaSeleccionada.id}`, payload);
      } else {
        await axios.put(`${BASE_URL}/${tablaSeleccionada.id}/${formData.id}`, payload);
      }
      onRegistroCreado();
      onClose();
    } catch (err: any) {
      console.error('Error al procesar la solicitud:', err);
      const msg = err.response?.data?.detail
        ? JSON.stringify(err.response.data.detail)
        : 'Error al conectar con el servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Borrar Registro
  const handleDelete = async () => {
    if (!formData.id) return;

    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar este registro (${tablaSeleccionada.endpointSingular} #${formData.id})?`
    );
    if (!confirmacion) return;

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`${BASE_URL}/${tablaSeleccionada.id}/${formData.id}`);
      onRegistroCreado();
      onClose();
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      setError('No se pudo eliminar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const renderCampos = () => {
    const esEdicion = modo === 'editar';

    switch (tablaSeleccionada.id) {
      case 'tableros':
        return (
          <>
            <label style={styles.label}>Título del Tablero *</label>
            <input
              type="text"
              name="titulo"
              required
              value={formData.titulo || ''}
              onChange={handleChange}
              placeholder="Ej. Proyecto Alpha"
              style={styles.input}
            />

            <label style={styles.label}>Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion || ''}
              onChange={handleChange}
              placeholder="Descripción breve..."
              style={styles.textarea}
            />

            <label style={styles.label}>Estado</label>
            <input
              type="text"
              name="estado"
              value={formData.estado || ''}
              onChange={handleChange}
              placeholder="Ej. Activo"
              style={styles.input}
            />
          </>
        );

      case 'listas':
        return (
          <>
            <label style={styles.label}>Tablero Padre *</label>
            <select
              name="tablero_id"
              required
              disabled={esEdicion} // Inamovible en edición
              value={formData.tablero_id || ''}
              onChange={handleChange}
              style={{ ...styles.input, ...(esEdicion ? styles.disabled : {}) }}
            >
              <option value="">-- Selecciona un Tablero --</option>
              {tableros.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo || `Tablero #${t.id}`}
                </option>
              ))}
            </select>

            <label style={styles.label}>Título de la Lista</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo || ''}
              onChange={handleChange}
              placeholder="Ej. Por Hacer, En Proceso"
              style={styles.input}
            />

            <label style={styles.label}>Número de Orden *</label>
            <input
              type="number"
              name="numero"
              required
              value={formData.numero ?? 1}
              onChange={handleChange}
              style={styles.input}
            />
          </>
        );

      case 'tarjetas':
        return (
          <>
            <label style={styles.label}>Lista Padre *</label>
            <select
              name="lista_id"
              required
              disabled={esEdicion} // Inamovible en edición
              value={formData.lista_id || ''}
              onChange={handleChange}
              style={{ ...styles.input, ...(esEdicion ? styles.disabled : {}) }}
            >
              <option value="">-- Selecciona una Lista --</option>
              {listas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.titulo || `Lista #${l.id}`}
                </option>
              ))}
            </select>

            <label style={styles.label}>Título de la Tarjeta</label>
            <input
              type="text"
              name="titulo"
              value={formData.titulo || ''}
              onChange={handleChange}
              placeholder="Ej. Corregir error de login"
              style={styles.input}
            />

            <label style={styles.label}>Descripción *</label>
            <textarea
              name="descripcion"
              required
              value={formData.descripcion || ''}
              onChange={handleChange}
              placeholder="Detalles de la tarea..."
              style={styles.textarea}
            />

            <label style={styles.label}>Prioridad (Número) *</label>
            <input
              type="number"
              name="prioridad"
              required
              value={formData.prioridad ?? 1}
              onChange={handleChange}
              style={styles.input}
            />

            <label style={styles.label}>Asignar a Usuario *</label>
            <select
              name="asignado_a"
              required
              value={formData.asignado_a || ''}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">-- Selecciona un Usuario --</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} (ID: {u.id})
                </option>
              ))}
            </select>

            <label style={styles.label}>Fecha de Vencimiento</label>
            <input
              type="datetime-local"
              name="fecha_vencimiento"
              value={formData.fecha_vencimiento ? formData.fecha_vencimiento.slice(0, 16) : ''}
              onChange={handleChange}
              style={styles.input}
            />
          </>
        );

      case 'registro_trabajo':
        return (
          <>
            <label style={styles.label}>Lista Asociada *</label>
            <select
              name="lista_id"
              required
              disabled={esEdicion} // Inamovible en edición
              value={formData.lista_id || ''}
              onChange={handleChange}
              style={{ ...styles.input, ...(esEdicion ? styles.disabled : {}) }}
            >
              <option value="">-- Selecciona una Lista --</option>
              {listas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.titulo || `Lista #${l.id}`}
                </option>
              ))}
            </select>

            <label style={styles.label}>Horas Dedicadas *</label>
            <input
              type="number"
              name="horas_dedicadas"
              required
              min="1"
              value={formData.horas_dedicadas ?? 1}
              onChange={handleChange}
              style={styles.input}
            />

            <label style={styles.label}>Descripción de la Tarea *</label>
            <textarea
              name="descripcion_tarea"
              required
              value={formData.descripcion_tarea || ''}
              onChange={handleChange}
              placeholder="Resumen del trabajo realizado..."
              style={styles.textarea}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modalCard}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {modo === 'crear' ? 'Añadir' : 'Editar'} {tablaSeleccionada.endpointSingular}
          </h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {renderCampos()}

          <div style={styles.buttonGroup}>
            {modo === 'editar' && (
              <button
                type="button"
                onClick={handleDelete}
                style={styles.deleteBtn}
                disabled={loading}
              >
                Eliminar
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={modo === 'crear' ? styles.submitBtn : styles.editBtn}
              disabled={loading}
            >
              {loading
                ? 'Procesando...'
                : modo === 'crear'
                ? 'Guardar Registro'
                : 'Actualizar Registro'}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    width: '100%',
    maxWidth: '480px',
    padding: '24px',
    boxSizing: 'border-box',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#0f172a',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    color: '#64748b',
    cursor: 'pointer',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginTop: '10px',
    marginBottom: '4px',
  },
  input: {
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  disabled: {
    backgroundColor: '#f1f5f9',
    cursor: 'not-allowed',
    color: '#64748b',
  },
  textarea: {
    padding: '9px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    outline: 'none',
    minHeight: '70px',
    resize: 'vertical',
    boxSizing: 'border-box',
    width: '100%',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  submitBtn: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  editBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  deleteBtn: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    padding: '9px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginRight: 'auto', // Alinea el botón de borrado a la izquierda
  },
};