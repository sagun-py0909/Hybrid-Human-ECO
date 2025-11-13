# Hybrid Human ECO

## Backend

- Run API (modular entry):
	- `C:/Users/sagun/OneDrive/Documents/GitHub/WRENCH_CLOUD/Hybrid-Human-ECO/.venv/Scripts/python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 51540 --reload`

Routers are modularized under `backend/app/routers/`:
- `auth`, `telemetry`, `admin_users`, `onboarding`, `user`, `programs`, `tickets`, `call_requests`, `reports`, `analytics`, `products`, `device_usage`.

Startup logic (seed + indexes) is centralized in `backend/app/startup.py` and invoked by `backend/app/main.py`.

## Frontend

- Run Expo Android:
	- `npx expo run:android`
