from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
import datetime

class Usuarios(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String)
    password = Column(String, nullable=False)
    rol = Column(String,nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)

class Tableros(Base):
    __tablename__ = "tableros"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(50), nullable=False)
    descripcion = Column(String)
    estado = Column(String)
    creador_id = Column(Integer,ForeignKey("usuarios.id"),nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow)
    listas = relationship("Listas", back_populates="tablero", cascade="all, delete-orphan")

class Listas(Base):
    __tablename__ = "listas"

    id = Column(Integer, primary_key=True, index=True)
    tablero_id = Column(Integer,ForeignKey("tableros.id"), nullable=False)
    titulo = Column(String)
    numero = Column(Integer,nullable=False)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow) 
    # Relación hacia el Tablero padre
    tablero = relationship("Tableros", back_populates="listas")
    
    # Relación con las Tareas fijadas en esta lista (Permite hacer: lista.tareas)
    Tarjetas = relationship("Tarjetas", back_populates="lista", cascade="all, delete-orphan")

class Tarjetas(Base):
    __tablename__ = "tarjetas"

    id = Column(Integer, primary_key=True, index=True)
    lista_id = Column(Integer,ForeignKey("listas.id"), nullable=False)
    titulo = Column(String)
    descripcion = Column(String, nullable=False)
    prioridad = Column(Integer,nullable=False)
    asignado_a = Column(Integer,ForeignKey("usuarios.id"),nullable=False)
    fecha_vencimiento = Column(DateTime)
    fecha_creacion = Column(DateTime, default=datetime.datetime.utcnow) 
    lista = relationship("Listas", back_populates="Tarjetas")

class Registro_Trabajo(Base):
    __tablename__ = "registro_trabajo"

    id = Column(Integer, primary_key=True, index=True)
    lista_id = Column(Integer,ForeignKey("listas.id"), nullable=False)
    usuario_id = Column(Integer,ForeignKey("usuarios.id"))
    horas_dedicadas = Column(Integer, nullable=False)
    descripcion_tarea = Column(String,nullable=False)
    fecha_registro = Column(DateTime, default=datetime.datetime.utcnow)


