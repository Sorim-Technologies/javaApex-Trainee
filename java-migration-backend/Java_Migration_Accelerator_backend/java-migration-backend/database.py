from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

from config import *

DATABASE_URL=f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine=create_engine(DATABASE_URL)

SessionLocal=sessionmaker(bind=engine)

Base=declarative_base()