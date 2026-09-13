from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import ensure_indexes

from app.auth.routes import router as auth_router
from app.routes.medicines import router as medicines_router
from app.routes.interactions import router as interactions_router
from app.routes.knowledge_base import router as knowledge_router
from app.routes.dosage import router as dosage_router
from app.routes.scanner import router as scanner_router
from app.routes.assistant import router as assistant_router
from app.routes.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(
    title="MediCare API",
    description="Backend for the MediCare AI Health Companion app.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(medicines_router)
app.include_router(interactions_router)
app.include_router(knowledge_router)
app.include_router(dosage_router)
app.include_router(scanner_router)
app.include_router(assistant_router)
app.include_router(reports_router)


@app.get("/api/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
