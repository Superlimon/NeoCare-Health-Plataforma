import React, { useState, useEffect } from 'react';
import { api } from '../App';
import CrearTablas from './Crear_tablas';

// --- IMPORTACIONES DE DND-KIT ---
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TablaInfo {
  id: string;
  nombre: string;
  endpointSingular: string;
}

const TABLAS_DISPONIBLES: TablaInfo[] = [
  { id: 'tableros', nombre: 'Tableros', endpointSingular: 'Tablero' },
  { id: 'listas', nombre: 'Listas', endpointSingular: 'Lista' },
  { id: 'tarjetas', nombre: 'Tarjetas', endpointSingular: 'Tarjeta' },
  { id: 'registro_trabajo', nombre: 'Registros de Trabajo', endpointSingular: 'Registro de Trabajo' },
];

interface DashboardProps {
  userId: number;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
}

export default function Dashboard({ userId, userEmail, userName, onLogout }: DashboardProps) {
  const [tablaActiva, setTablaActiva] = useState<TablaInfo>(TABLAS_DISPONIBLES[0]);
  const [datos, setDatos] = useState<any[]>([]);
  const [listas, setListas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modo de vista: 'tabla' o 'kanban'
  const [vistaKanban, setVistaKanban] = useState<boolean>(false);

  // Estado para la tarjeta activa en Drag & Drop
  const [activeCard, setActiveCard] = useState<any | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registroAEditar, setRegistroAEditar] = useState<Record<string, any> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Cargar datos desde la API
  const fetchDatosTabla = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/${tablaActiva.id}`);
      setDatos(Array.isArray(res.data) ? res.data : []);

      if (tablaActiva.id === 'tarjetas') {
        try {
          const resListas = await api.get('/listas');
          setListas(Array.isArray(resListas.data) ? resListas.data : []);
        } catch (e) {
          console.error("Error cargando listas para Kanban:", e);
          setListas([]);
        }
      }
    } catch (err: any) {
      console.error(`Error al cargar ${tablaActiva.id}:`, err);
      setError(`No se pudieron obtener los datos de ${tablaActiva.nombre}.`);
      setDatos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatosTabla();
  }, [tablaActiva]);

  // Handlers Modal
  const handleAbrirCrear = () => {
    setRegistroAEditar(null);
    setIsModalOpen(true);
  };

  const handleAbrirEditar = (item: any) => {
    setRegistroAEditar(item);
    setIsModalOpen(true);
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardEncontrada = datos.find((c) => c && String(c.id) === String(active.id));
    setActiveCard(cardEncontrada || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeCardObj = datos.find((item) => item && String(item.id) === activeId);
    if (!activeCardObj) return;

    const esSobreColumna = (listas || []).some((l) => l && `col-${l.id}` === overId);
    let targetListaId: number;

    if (esSobreColumna) {
      targetListaId = Number(overId.replace('col-', ''));
    } else {
      const overCardObj = datos.find((item) => item && String(item.id) === overId);
      if (!overCardObj) return;
      targetListaId = Number(overCardObj.lista_id);
    }

    // Cambia de columna en caliente si la tarjeta activa se desplaza a otra lista
    if (Number(activeCardObj.lista_id) !== targetListaId) {
      setDatos((prev) =>
        prev.map((item) =>
          String(item.id) === activeId ? { ...item, lista_id: targetListaId } : item
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeCardObj = datos.find((c) => c && String(c.id) === activeId);
    if (!activeCardObj) return;

    const esSobreColumna = (listas || []).some((l) => l && `col-${l.id}` === overId);
    let targetListaId: number;
    let nuevoOrden: number = 0;

    if (esSobreColumna) {
      targetListaId = Number(overId.replace('col-', ''));
      const tarjetasCol = datos.filter((c) => Number(c.lista_id) === targetListaId);
      nuevoOrden = tarjetasCol.length;
    } else {
      const overCardObj = datos.find((c) => c && String(c.id) === overId);
      if (!overCardObj) return;
      targetListaId = Number(overCardObj.lista_id);
      nuevoOrden = overCardObj.orden ?? 0;
    }

    const datosOriginales = [...datos];

    // Reordenamiento local
    const activeIndex = datos.findIndex((item) => item && String(item.id) === activeId);
    if (activeId !== overId && !esSobreColumna) {
      const overIndex = datos.findIndex((item) => item && String(item.id) === overId);
      if (overIndex !== -1) {
        setDatos((prev) => arrayMove(prev, activeIndex, overIndex));
      }
    }

    // Persistencia Backend
    try {
      await api.patch(`/tarjetas/${activeId}/move`, {
        nueva_lista_id: targetListaId,
        nuevo_orden: nuevoOrden,
      });
    } catch (err) {
      console.error('Error al guardar movimiento:', err);
      setError('No se pudo guardar la posición en el servidor.');
      setDatos(datosOriginales);
    }
  };

  // Render Cabeceras Tabla
  const renderHeaders = () => {
    switch (tablaActiva.id) {
      case 'tableros':
        return (
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Título</th>
            <th style={styles.th}>Descripción</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Creador ID</th>
            <th style={styles.th}>Acción</th>
          </tr>
        );
      case 'listas':
        return (
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Título</th>
            <th style={styles.th}>Orden (#)</th>
            <th style={styles.th}>Tablero ID</th>
            <th style={styles.th}>Acción</th>
          </tr>
        );
      case 'tarjetas':
        return (
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Título</th>
            <th style={styles.th}>Descripción</th>
            <th style={styles.th}>Prioridad</th>
            <th style={styles.th}>Lista ID</th>
            <th style={styles.th}>Asignado A</th>
            <th style={styles.th}>Vencimiento</th>
            <th style={styles.th}>Acción</th>
          </tr>
        );
      case 'registro_trabajo':
        return (
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Lista ID</th>
            <th style={styles.th}>Usuario ID</th>
            <th style={styles.th}>Horas</th>
            <th style={styles.th}>Descripción Tarea</th>
            <th style={styles.th}>Acción</th>
          </tr>
        );
      default:
        return null;
    }
  };

  // Render Filas Tabla
  const renderRows = () => {
    if (!Array.isArray(datos) || datos.length === 0) {
      return (
        <tr>
          <td colSpan={8} style={styles.emptyTd}>
            No hay registros disponibles en {tablaActiva.nombre}.
          </td>
        </tr>
      );
    }

    return datos.map((item) => (
      <tr key={item.id} style={styles.tr}>
        <td style={styles.td}>{item.id}</td>

        {tablaActiva.id === 'tableros' && (
          <>
            <td style={styles.tdBold}>{item.titulo}</td>
            <td style={styles.td}>{item.descripcion || '-'}</td>
            <td style={styles.td}>{item.estado || 'Activo'}</td>
            <td style={styles.td}>{item.creador_id}</td>
          </>
        )}

        {tablaActiva.id === 'listas' && (
          <>
            <td style={styles.tdBold}>{item.titulo || '-'}</td>
            <td style={styles.td}>{item.numero}</td>
            <td style={styles.td}>{item.tablero_id}</td>
          </>
        )}

        {tablaActiva.id === 'tarjetas' && (
          <>
            <td style={styles.tdBold}>{item.titulo || '-'}</td>
            <td style={styles.td}>{item.descripcion}</td>
            <td style={styles.td}>{String(item.prioridad ?? '-')}</td>
            <td style={styles.td}>{item.lista_id}</td>
            <td style={styles.td}>{item.asignado_a}</td>
            <td style={styles.td}>
              {item.fecha_vencimiento
                ? new Date(item.fecha_vencimiento).toLocaleDateString()
                : '-'}
            </td>
          </>
        )}

        {tablaActiva.id === 'registro_trabajo' && (
          <>
            <td style={styles.td}>{item.lista_id}</td>
            <td style={styles.td}>{item.usuario_id}</td>
            <td style={styles.td}>{item.horas_dedicadas}h</td>
            <td style={styles.td}>{item.descripcion_tarea}</td>
          </>
        )}

        <td style={styles.td}>
          <button
            onClick={() => handleAbrirEditar(item)}
            style={styles.btnEditarTabla}
          >
            Editar / Eliminar
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Gestión</h1>
          <p style={styles.subtitle}>
            Hola, <strong>{userName || userEmail || `Usuario #${userId}`}</strong> (ID #{userId})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={handleAbrirCrear} style={styles.btnCrear}>
            + Añadir {tablaActiva.endpointSingular}
          </button>
          {onLogout && (
            <button onClick={onLogout} style={styles.btnLogout}>
              Cerrar Sesión
            </button>
          )}
        </div>
      </header>

      {/* NAVEGACIÓN PESTAÑAS */}
      <nav style={styles.navTabs}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {TABLAS_DISPONIBLES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTablaActiva(t);
                if (t.id !== 'tarjetas') setVistaKanban(false);
              }}
              style={{
                ...styles.tabButton,
                ...(tablaActiva.id === t.id ? styles.activeTab : {}),
              }}
            >
              {t.nombre}
            </button>
          ))}
        </div>

        {/* TOGGLE VISTA KANBAN */}
        {tablaActiva.id === 'tarjetas' && (
          <div style={styles.toggleContainer}>
            <button
              onClick={() => setVistaKanban(false)}
              style={{
                ...styles.toggleBtn,
                ...(!vistaKanban ? styles.toggleActive : {}),
              }}
            >
              📋 Tabla
            </button>
            <button
              onClick={() => setVistaKanban(true)}
              style={{
                ...styles.toggleBtn,
                ...(vistaKanban ? styles.toggleActive : {}),
              }}
            >
              📊 Kanban
            </button>
          </div>
        )}
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <div style={styles.cardContent}>
        {error && <div style={styles.errorBox}>{error}</div>}

        {loading ? (
          <div style={styles.loadingText}>Cargando {tablaActiva.nombre}...</div>
        ) : vistaKanban && tablaActiva.id === 'tarjetas' ? (
          !listas || listas.length === 0 ? (
            <div style={styles.emptyColumnText}>
              No hay listas creadas aún. Por favor ve a la pestaña "Listas" y crea al menos una para organizar el Kanban.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div style={styles.kanbanBoard}>
                {listas.map((columna) => {
                  const tarjetasDeColumna = (datos || []).filter(
                    (card) => card && Number(card.lista_id) === Number(columna.id)
                  );
                  return (
                    <KanbanColumn
                      key={columna.id}
                      columna={columna}
                      tarjetas={tarjetasDeColumna}
                      onCardClick={handleAbrirEditar}
                    />
                  );
                })}
              </div>

              <DragOverlay dropAnimation={null}>
                {activeCard ? <CardItem tarjeta={activeCard} isOverlay /> : null}
              </DragOverlay>
            </DndContext>
          )
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>{renderHeaders()}</thead>
              <tbody>{renderRows()}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR/EDITAR */}
      <CrearTablas
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tablaSeleccionada={tablaActiva}
        userId={userId}
        onRegistroCreado={fetchDatosTabla}
        registroEditar={registroAEditar}
      />
    </div>
  );
}

// --- SUBCOMPONENTE COLUMNA KANBAN (Uso correcto de useDroppable) ---
function KanbanColumn({
  columna,
  tarjetas,
  onCardClick,
}: {
  columna: any;
  tarjetas: any[];
  onCardClick: (item: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${columna.id}`,
    data: { type: 'Column', columna },
  });

  const validTarjetas = Array.isArray(tarjetas) ? tarjetas : [];
  const itemsIds = validTarjetas.map((t) => String(t.id));

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.kanbanColumn,
        backgroundColor: isOver ? '#f1f5f9' : '#f8fafc',
      }}
    >
      <div style={styles.columnHeader}>
        <h3 style={styles.columnTitle}>{columna.titulo || `Lista #${columna.id}`}</h3>
        <span style={styles.columnBadge}>{validTarjetas.length}</span>
      </div>

      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
        <div style={styles.columnCardsList}>
          {validTarjetas.length === 0 ? (
            <div style={styles.emptyColumnText}>Sin tarjetas</div>
          ) : (
            validTarjetas.map((card) => (
              <SortableCard
                key={card.id}
                tarjeta={card}
                onCardClick={onCardClick}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// --- SUBCOMPONENTE TARJETA ORDENABLE ---
function SortableCard({
  tarjeta,
  onCardClick,
}: {
  tarjeta: any;
  onCardClick: (item: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(tarjeta.id) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardItem tarjeta={tarjeta} onClick={() => onCardClick(tarjeta)} />
    </div>
  );
}

// --- ITEM VISUAL DE TARJETA ---
function CardItem({
  tarjeta,
  onClick,
  isOverlay = false,
}: {
  tarjeta: any;
  onClick?: () => void;
  isOverlay?: boolean;
}) {
  const getBadgeColor = (prioridad: any) => {
    const prioStr = String(prioridad ?? '').toLowerCase();

    if (prioStr === 'alta' || prioStr === '3' || prioStr === '1') {
      return { bg: '#fee2e2', text: '#991b1b', label: 'Alta' };
    }
    if (prioStr === 'media' || prioStr === '2') {
      return { bg: '#fef3c7', text: '#92400e', label: 'Media' };
    }
    return { bg: '#e0f2fe', text: '#075985', label: 'Baja' };
  };

  const badge = getBadgeColor(tarjeta?.prioridad);

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.kanbanCard,
        ...(isOverlay ? styles.overlayCard : {}),
      }}
    >
      <div style={styles.cardHeaderRow}>
        <span
          style={{
            ...styles.priorityBadge,
            backgroundColor: badge.bg,
            color: badge.text,
          }}
        >
          {badge.label}
        </span>
        <span style={styles.cardId}>#{tarjeta?.id}</span>
      </div>

      <h4 style={styles.cardTitle}>{tarjeta?.titulo || 'Sin Título'}</h4>
      {tarjeta?.descripcion && (
        <p style={styles.cardDesc}>{tarjeta.descripcion}</p>
      )}

      {tarjeta?.fecha_vencimiento && (
        <div style={styles.cardFooter}>
          <span>📅 {new Date(tarjeta.fecha_vencimiento).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}

// --- ESTILOS EN LÍNEA OPTIMIZADOS ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '32px',
    maxWidth: '1280px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 800,
    margin: 0,
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#64748b',
    fontSize: '0.9rem',
  },
  btnCrear: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  btnLogout: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  navTabs: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #e2e8f0',
    marginBottom: '24px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
  },
  activeTab: {
    color: '#2563eb',
    borderBottom: '2px solid #2563eb',
  },
  toggleContainer: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '8px',
  },
  toggleBtn: {
    border: 'none',
    background: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
  },
  toggleActive: {
    backgroundColor: '#ffffff',
    color: '#2563eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    minHeight: '400px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    backgroundColor: '#f8fafc',
    padding: '12px 16px',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '14px 16px',
    fontSize: '0.9rem',
    color: '#334155',
  },
  tdBold: {
    padding: '14px 16px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  emptyTd: {
    padding: '32px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.95rem',
  },
  btnEditarTabla: {
    backgroundColor: '#f1f5f9',
    color: '#2563eb',
    border: '1px solid #cbd5e1',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  loadingText: {
    padding: '40px',
    textAlign: 'center',
    color: '#64748b',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  kanbanBoard: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '12px',
    minHeight: '450px',
    backgroundColor: '#ffffff',
  },
  kanbanColumn: {
    borderRadius: '10px',
    width: '280px',
    minWidth: '280px',
    padding: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    transition: 'background-color 0.2s ease',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0',
  },
  columnTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    margin: 0,
    color: '#1e293b',
  },
  columnBadge: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
  },
  columnCardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flexGrow: 1,
    minHeight: '100px',
  },
  emptyColumnText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.85rem',
    padding: '20px',
    border: '1px dashed #cbd5e1',
    borderRadius: '6px',
  },
  kanbanCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #cbd5e1',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    cursor: 'grab',
    userSelect: 'none',
  },
  overlayCard: {
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    transform: 'rotate(2deg)',
    cursor: 'grabbing',
    backgroundColor: '#ffffff',
    border: '1px solid #2563eb',
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  priorityBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  cardId: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 600,
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#64748b',
    lineHeight: 1.3,
  },
  cardFooter: {
    marginTop: '10px',
    paddingTop: '6px',
    borderTop: '1px solid #f1f5f9',
    fontSize: '0.75rem',
    color: '#64748b',
  },
};