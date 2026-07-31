"""uvicorn app.main:app --reload --port 5000"""
"""Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"""
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException , status # <-- Añadido HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError  # <-- Añadido VerifyMismatchError
from app.security import encriptar_password
from typing import Optional,List

from app.models import Usuarios, Tableros, Tarjetas, Registro_Trabajo, Listas
from app.database import SessionLocal, engine, Base, Session
from . import schemas
Base.metadata.create_all(bind=engine)
app = FastAPI()
origins = [
    "https://neo-care-health-plataforma-p8fylrlu0.vercel.app",  # Tu URL exacta de Vercel
    "https://neo-care-health-plataforma.vercel.app",            # Tu URL principal
    "http://localhost:5173",                                     # Para pruebas locales
    "http://127.0.0.1:8000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
SECRET_KEY = "paquito_chocolatero_el_mas_rico_del_mundo_entero"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
# 1. Inicializamos el verificador de Argon2
ph = PasswordHasher()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def obtener_usuario_actual(token: str = Depends(oauth2_scheme),db: Session = Depends(get_db)):
    excepcion_autenticacion = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado. Por favor inicia sesión de nuevo.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decodificamos el JWT usando la clave secreta
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id: str = payload.get("sub") # 'sub' guarda el ID del usuario
        
        if usuario_id is None:
            raise excepcion_autenticacion
            
    except jwt.PyJWTError:
        # Si el token fue alterado, expiró o no es válido
        raise excepcion_autenticacion

    # Buscamos al usuario en PostgreSQL
    user = db.query(Usuarios).filter(Usuarios.id == int(usuario_id)).first()
    if user is None:
        raise excepcion_autenticacion

    # Si todo está OK, devolvemos el objeto del usuario autenticado
    return user
def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
# Definimos la estructura de datos que React nos va a enviar

@app.post("/login")
def login(data: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    # 1. Buscamos al usuario por email
    user = db.query(Usuarios).filter(Usuarios.email == data.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    # 2. Verificamos la contraseña con Argon2
    try:
        ph.verify(user.password, data.password)
    except VerifyMismatchError:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    # 3. Generamos el token JWT (guardando el ID como 'sub')
    access_token = crear_token_acceso(data={"sub": str(user.id)})
    
    # 4. Devolvemos el token y los datos del usuario
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email
        }
    }

@app.post("/creador_Usuarios")
def crear_usuario(usuario_data: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    # Comprobar si el email ya existe
    existe = db.query(Usuarios).filter(Usuarios.email == usuario_data.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    # Encriptamos la contraseña con Argon2
    hashed_password = encriptar_password(usuario_data.password)
    
    nuevo_usuario = Usuarios(
        nombre=usuario_data.nombre,
        email=usuario_data.email,
        password=hashed_password,
        rol=usuario_data.rol
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario
@app.get("/usuarios")
def obtener_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuarios).all()

@app.post("/tableros", response_model=schemas.TableroOut, status_code=status.HTTP_201_CREATED)
def crear_tablero(tablero: schemas.TableroCreate, db: Session = Depends(get_db)):
    # Comprobar si el usuario creador existe
    usuario_existe = db.query(Usuarios).filter(Usuarios.id == tablero.creador_id).first()
    if not usuario_existe:
        raise HTTPException(status_code=404, detail="El usuario creador no existe.")

    nuevo_tablero = Tableros(
        titulo=tablero.titulo,
        descripcion=tablero.descripcion,
        estado=tablero.estado,
        creador_id=tablero.creador_id
    )
    
    db.add(nuevo_tablero)
    db.commit()
    db.refresh(nuevo_tablero)
    return nuevo_tablero

@app.get("/tableros", response_model=List[schemas.TableroOut])
def obtener_tableros(db: Session = Depends(get_db)):
    return db.query(Tableros).all()

# main.py

@app.delete("/tableros/{tablero_id}", response_model=schemas.TableroOut, status_code=status.HTTP_200_OK)
def borrar(tablero_id: int, db: Session = Depends(get_db)):
    # 1. Buscar el tablero
    tablero_db = db.query(Tableros).filter(Tableros.id == tablero_id).first()
    if not tablero_db:
        raise HTTPException(status_code=404, detail="Tablero no encontrado")

    # 2. Obtener IDs de las listas asociadas
    listas_ids = [lista.id for lista in tablero_db.listas]

    if listas_ids:
        # A) Borrar TARJETAS vinculadas a las listas (¡NUEVO!)
        db.query(Tarjetas).filter(Tarjetas.lista_id.in_(listas_ids)).delete(synchronize_session=False)

        # B) Borrar REGISTROS DE TRABAJO vinculados a las listas
        db.query(Registro_Trabajo).filter(Registro_Trabajo.lista_id.in_(listas_ids)).delete(synchronize_session=False)

        # C) Borrar LISTAS
        db.query(Listas).filter(Listas.tablero_id == tablero_id).delete(synchronize_session=False)

    # 3. Borrar el TABLERO
    db.delete(tablero_db)
    
    # 4. Confirmar en BD
    db.commit()

    return tablero_db

@app.put("/tableros/{tablero_id}",response_model=schemas.TableroOut)
def update(tablero_id : int,tablero_actualizado : schemas.TableroUpdate, db:Session=Depends(get_db)):
    tablero_db = db.query(Tableros).filter(tablero_id == Tableros.id).first()
    if not tablero_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tablero no encontrado"
        )

    datos_recibidos = tablero_actualizado.dict(exclude_unset=True)

    # 2. Recorrer esos campos y actualizar únicamente los presentes
    for campo, valor in datos_recibidos.items():
        setattr(tablero_db, campo, valor)
    db.commit()
    db.refresh(tablero_db)
    
    return tablero_db

@app.post("/listas", response_model=schemas.ListaOut, status_code=status.HTTP_201_CREATED)
def crear_lista(lista: schemas.ListaCreate, db: Session = Depends(get_db)):
    nueva_lista = Listas(
        tablero_id=lista.tablero_id,
        titulo=lista.titulo,
        numero=lista.numero
    )
    db.add(nueva_lista)
    db.commit()
    db.refresh(nueva_lista)
    return nueva_lista


@app.get("/listas", response_model=List[schemas.ListaOut])
def obtener_listas(db: Session = Depends(get_db)):
    return db.query(Listas).all()

@app.post("/tarjetas", response_model=schemas.TarjetaOut, status_code=status.HTTP_201_CREATED)
def crear_tarjeta(tarjeta: schemas.TarjetaCreate, db: Session = Depends(get_db)):
    nueva_tarjeta = Tarjetas(
        lista_id=tarjeta.lista_id,
        titulo=tarjeta.titulo,
        descripcion=tarjeta.descripcion,
        prioridad=tarjeta.prioridad,  # Corregido: 'prioridad' en lugar de 'posicion'
        asignado_a=tarjeta.asignado_a,
        fecha_vencimiento=tarjeta.fecha_vencimiento
    )
    db.add(nueva_tarjeta)
    db.commit()
    db.refresh(nueva_tarjeta)
    return nueva_tarjeta


@app.get("/tarjetas", response_model=List[schemas.TarjetaOut])
def obtener_tarjetas(db: Session = Depends(get_db),usuario_actual: Usuarios = Depends(obtener_usuario_actual)):
    return db.query(Tarjetas).all()

@app.put("/tarjetas/{tarjeta_id}")
def actualizar_tarjeta(tarjeta_id: int, tarjeta: dict, db: Session = Depends(get_db)):
    # 1. Buscar la tarjeta en la base de datos
    db_tarjeta = db.query(Tarjetas).filter(Tarjetas.id == tarjeta_id).first()
    
    # Si no la encuentra, devuelve 404
    if not db_tarjeta:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
    
    # 2. Actualizar la lista_id (y demás campos que envíe el frontend)
    for clave, valor in tarjeta.items():
        setattr(db_tarjeta, clave, valor)
    
    # 3. Guardar cambios
    db.commit()
    db.refresh(db_tarjeta)
    
    return db_tarjeta

@app.patch("/tarjetas/{tarjeta_id}/move")
def mover_tarjeta(
    tarjeta_id: int, 
    datos: schemas.MoverTarjetas, 
    db: Session = Depends(get_db)
):
    # 1. Buscar la tarjeta a mover
    tarjeta = db.query(Tarjetas).filter(Tarjetas.id == tarjeta_id).first()
    if not tarjeta:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")

    lista_origen_id = tarjeta.lista_id
    lista_destino_id = datos.nueva_lista_id
    nuevo_orden = datos.nuevo_orden

    # 2. Si cambia de columna/lista, reajustamos ambas listas
    if lista_origen_id != lista_destino_id:
        # Reordenar lista origen (las que estaban abajo suben)
        db.query(Tarjetas).filter(
            Tarjetas.lista_id == lista_origen_id,
            Tarjetas.prioridad > tarjeta.prioridad
        ).update({Tarjetas.prioridad: Tarjetas.prioridad - 1})

        # Hacemos espacio en la lista destino (las que están abajo bajan)
        db.query(Tarjetas).filter(
            Tarjetas.lista_id == lista_destino_id,
            Tarjetas.prioridad >= nuevo_orden
        ).update({Tarjetas.prioridad: Tarjetas.prioridad + 1})

        tarjeta.lista_id = lista_destino_id
        tarjeta.prioridad = nuevo_orden
    else:
        # Reordenar dentro de la misma columna
        if tarjeta.prioridad < nuevo_orden:
            db.query(Tarjetas).filter(
                Tarjetas.lista_id == lista_origen_id,
                Tarjetas.prioridad > tarjeta.prioridad,
                Tarjetas.prioridad <= nuevo_orden
            ).update({Tarjetas.orden: Tarjetas.orden - 1})
        elif tarjeta.prioridad > nuevo_orden:
            db.query(Tarjetas).filter(
                Tarjetas.lista_id == lista_origen_id,
                Tarjetas.prioridad >= nuevo_orden,
                Tarjetas.prioridad < tarjeta.prioridad
            ).update({Tarjetas.prioridad: Tarjetas.prioridad + 1})
            
        tarjeta.prioridad = nuevo_orden

    db.commit()
    return {"status": "ok", "message": "Tarjeta reordenada exitosamente"}
@app.post("/registro_trabajo", response_model=schemas.RegistroTrabajoOut, status_code=status.HTTP_201_CREATED)
def crear_registro(registro: schemas.RegistroTrabajoCreate, db: Session = Depends(get_db)):
    nuevo_registro = Registro_Trabajo(
        lista_id=registro.lista_id,  # Corregido: 'lista_id' para sincronizar con tu BD y Pydantic
        usuario_id=registro.usuario_id,
        horas_dedicadas=registro.horas_dedicadas,
        descripcion_tarea=registro.descripcion_tarea
    )
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro

@app.get("/registro_trabajo", response_model=List[schemas.RegistroTrabajoOut])
def obtener_registro_trabajo(db: Session = Depends(get_db),usuario_actual: Usuarios = Depends(obtener_usuario_actual)):
    return db.query(Registro_Trabajo).filter( Registro_Trabajo.usuario_id == usuario_actual.id).all()

@app.delete("/registro_trabajo/{registro_id}", response_model=schemas.RegistroTrabajoOut, status_code=status.HTTP_200_OK)
def borrar(registro_id: int, db: Session = Depends(get_db),usuario_actual: Usuarios = Depends(obtener_usuario_actual)):
        # 1. Buscar el tablero
    registro_db = db.query(Registro_Trabajo).filter(Registro_Trabajo.id == registro_id).first()
    if not registro_db:
        raise HTTPException(status_code=404, detail="Registro de trabajo no encontrado")

    # 2. Validar que el registro pertenezca al usuario autenticado (Cumple la Lista de Aceptación)
    if registro_db.usuario_id != usuario_actual.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para borrar este registro")

    # 3. Borrar el TABLERO
    db.delete(registro_db)
    
    # 4. Confirmar en BD
    db.commit()

    return registro_db
