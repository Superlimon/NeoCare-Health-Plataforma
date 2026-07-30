from argon2 import PasswordHasher
import jwt
from datetime import datetime, timedelta, timezone

ph = PasswordHasher()
SECRET_KEY = "MI_CLAVE_SECRETA_123"
ALGORITHM = "HS256"

def encriptar_password(password: str) -> str:
    return ph.hash(password)

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return ph.verify(hashed_password, plain_password)
    except Exception:
        return False

def crear_token_acceso(data: dict) -> str:
    to_encode = data.copy()
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode.update({"exp": expiracion})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)