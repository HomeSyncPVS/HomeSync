from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.societies import router as societies_router
from app.api.v1.wings import router as wings_router
from app.api.v1.floors import router as floors_router
from app.api.v1.flats import router as flats_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(societies_router)
api_router.include_router(wings_router)
api_router.include_router(floors_router)
api_router.include_router(flats_router)

