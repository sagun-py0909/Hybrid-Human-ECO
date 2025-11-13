import os
import time
import uuid
import pytest
import requests

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:51540")


def _url(p: str) -> str:
    return f"{API_BASE_URL}{p}"


def _skip_if_down():
    try:
        requests.get(_url("/docs"), timeout=2)
    except Exception as e:
        pytest.skip(f"API not reachable at {API_BASE_URL}: {e}")


@pytest.fixture(scope="session")
def auth_token():
    _skip_if_down()
    # Try to register a unique user, else fallback to login
    identifier = f"smoke_{uuid.uuid4().hex[:8]}"
    email = f"{identifier}@example.com"
    password = "SmokeTest#123"

    register_payload = {
        "username": identifier,
        "email": email,
        "password": password,
        "fullName": "Smoke Test",
        "phone": "+10000000000",
    }
    r = requests.post(_url("/api/auth/register"), json=register_payload, timeout=5)
    if r.status_code not in (200, 201, 409, 400):
        pytest.skip(f"Register failed with {r.status_code}: {r.text}")

    login_payload = {"identifier": email, "password": password}
    r = requests.post(_url("/api/auth/login"), json=login_payload, timeout=5)
    if r.status_code != 200:
        pytest.skip(f"Login failed with {r.status_code}: {r.text}")
    token = r.json().get("access_token")
    assert token
    return token


def test_docs_up():
    _skip_if_down()
    r = requests.get(_url("/docs"), timeout=5)
    assert r.status_code == 200


def test_auth_me(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = requests.get(_url("/api/auth/me"), headers=headers, timeout=5)
    assert r.status_code == 200
    assert r.json().get("email")


def test_onboarding_user_mode(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = requests.get(_url("/api/user/mode"), headers=headers, timeout=5)
    assert r.status_code == 200
    assert "mode" in r.json()


def test_programs_today(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = requests.get(_url("/api/programs/today"), headers=headers, timeout=5)
    assert r.status_code == 200


def test_telemetry_ingest(auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    payload = {
        "deviceId": "smoke-device",
        "samples": [
            {"timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "type": "hr", "value": 60.0}
        ],
    }
    r = requests.post(_url("/api/device/telemetry"), headers=headers, json=payload, timeout=5)
    assert r.status_code in (200, 201)
