from fastapi import APIRouter

from sunbronze_api.api.routes import appointments, auth, health, reference_data, staff, system_users, whatsapp

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(appointments.router, tags=["appointments"])
api_router.include_router(reference_data.router, tags=["reference-data"])
api_router.include_router(staff.router, tags=["staff"])
api_router.include_router(system_users.router, tags=["system-users"])
api_router.include_router(whatsapp.router, tags=["whatsapp"])
