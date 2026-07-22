from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.societies import router as societies_router
from app.api.v1.residents import router as residents_router
from app.api.v1.wings import router as wings_router
from app.api.v1.floors import router as floors_router
from app.api.v1.flats import router as flats_router
from app.api.v1.bills import router as bills_router
from app.api.v1.payments import router as payments_router
from app.api.v1.reports import router as reports_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.complaints import router as complaints_router
from app.api.v1.notices import router as notices_router
from app.api.v1.events import router as events_router
from app.api.v1.debug import router as debug_router

from app.api.v1.subscriptions import router as subscriptions_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(societies_router)
api_router.include_router(residents_router)
api_router.include_router(wings_router)
api_router.include_router(floors_router)
api_router.include_router(flats_router)
api_router.include_router(bills_router)
api_router.include_router(payments_router)
api_router.include_router(reports_router)
api_router.include_router(analytics_router)
api_router.include_router(complaints_router, prefix="/complaints", tags=["complaints"])
api_router.include_router(notices_router, prefix="/notices", tags=["notices"])
api_router.include_router(events_router, prefix="/events", tags=["events"])
api_router.include_router(subscriptions_router)
api_router.include_router(debug_router)
