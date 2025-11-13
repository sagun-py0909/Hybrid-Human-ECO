import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from backend.app.core.database import db, client as mongo_client
from backend.app.routers import auth as auth_router_module
from backend.app.routers import telemetry as telemetry_router_module
from backend.app.routers import admin_users as admin_users_router_module
from backend.app.routers import onboarding as onboarding_router_module
from backend.app.routers import user as user_router_module
from backend.app.routers import programs as programs_router_module
from backend.app.routers import tickets as tickets_router_module
from backend.app.routers import call_requests as call_requests_router_module
from backend.app.routers import reports as reports_router_module
from backend.app.routers import analytics as analytics_router_module
from backend.app.routers import products as products_router_module
from backend.app.routers import device_usage as device_usage_router_module
from backend.app.startup import seed_database


def create_app() -> FastAPI:
    app = FastAPI(title="Hybrid Human API")

    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(auth_router_module.router)
    app.include_router(telemetry_router_module.router)
    app.include_router(admin_users_router_module.router)
    app.include_router(onboarding_router_module.router)
    app.include_router(user_router_module.router)
    app.include_router(programs_router_module.router)
    app.include_router(tickets_router_module.router)
    app.include_router(call_requests_router_module.router)
    app.include_router(reports_router_module.router)
    app.include_router(analytics_router_module.router)
    app.include_router(products_router_module.router)
    app.include_router(device_usage_router_module.router)

    # Startup: seed database and ensure indexes
    @app.on_event("startup")
    async def on_startup():
        await seed_database()
        try:
            await db.telemetry.create_index([("userId", 1), ("timestamp", -1)])
            await db.telemetry.create_index([("timestamp", -1)])
        except Exception as e:
            logging.warning(f"Telemetry index creation failed: {e}")

    @app.on_event("shutdown")
    async def on_shutdown():
        try:
            mongo_client.close()
        except Exception:
            pass

    return app


app = create_app()
