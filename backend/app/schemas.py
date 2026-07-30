from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# ==========================================================================
# 1. USUARIOS
# ==========================================================================
class UsuarioCreate(BaseModel):
    nombre: str
    email: Optional[str] = None
    password: str
    rol: str

class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: Optional[str] = None
    rol: str
    fecha_creacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UsuarioLogin(BaseModel):
    email: str
    password: str


# ==========================================================================
# 2. TABLEROS
# ==========================================================================
class TableroCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    creador_id: int  # FK -> usuarios.id
    
class TableroOut(BaseModel):
    id: int
    titulo: str
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    creador_id: int
    fecha_creacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TableroUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None
    creador_id: Optional[int] = None


# ==========================================================================
# 3. LISTAS
# ==========================================================================
class ListaCreate(BaseModel):
    tablero_id: int  # FK -> tableros.id
    titulo: Optional[str] = None
    numero: int

class ListaOut(BaseModel):
    id: int
    tablero_id: int
    titulo: Optional[str] = None
    numero: int
    fecha_creacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# 4. TARJETAS
# ==========================================================================
class TarjetaCreate(BaseModel):
    lista_id: int  # FK -> listas.id
    titulo: Optional[str] = None
    descripcion: str
    prioridad: int
    asignado_a: int  # FK -> usuarios.id
    fecha_vencimiento: Optional[datetime] = None

class TarjetaOut(BaseModel):
    id: int
    lista_id: int
    titulo: Optional[str] = None
    descripcion: str
    prioridad: int
    asignado_a: int
    fecha_vencimiento: Optional[datetime] = None
    fecha_creacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MoverTarjetas(BaseModel):
    nueva_lista_id :int
    nuevo_orden :int


# ==========================================================================
# 5. REGISTRO DE TRABAJO
# ==========================================================================
class RegistroTrabajoCreate(BaseModel):
    lista_id: int  # FK -> listas.id
    usuario_id: Optional[int] = None  # FK -> usuarios.id
    horas_dedicadas: int
    descripcion_tarea: str

class RegistroTrabajoOut(BaseModel):
    id: int
    lista_id: int
    usuario_id: Optional[int] = None
    horas_dedicadas: int
    descripcion_tarea: str
    fecha_registro: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)