from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base,sessionmaker, Session

# 1. Dirección de la base de datos (Usuario, contraseña, servidor, puerto y nombre de la BD)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:123@localhost:5432/mi_tablero_db"

# 2. El motor (Engine) que gestiona las conexiones físicas a Postgres
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 3. La fábrica de sesiones (Para abrir y cerrar conversaciones con la BD)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. El molde base que usarán nuestros modelos (Tablas) para crearse
Base = declarative_base()