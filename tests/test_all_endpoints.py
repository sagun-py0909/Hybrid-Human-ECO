"""Comprehensive endpoint verification for all routers."""
import os
import time
import uuid
import pytest
import requests

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:51540")


def _url(p: str) -> str:
    return f"{API_BASE_URL}{p}"


@pytest.fixture(scope="session")
def admin_token():
    """Login as admin user."""
    login_payload = {"identifier": "admin@hybridhuman.com", "password": "admin123"}
    r = requests.post(_url("/api/auth/login"), json=login_payload, timeout=5)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    token = r.json().get("access_token")
    assert token
    return token


@pytest.fixture(scope="session")
def user_token():
    """Login as regular user."""
    login_payload = {"identifier": "john@example.com", "password": "password123"}
    r = requests.post(_url("/api/auth/login"), json=login_payload, timeout=5)
    assert r.status_code == 200, f"User login failed: {r.text}"
    token = r.json().get("access_token")
    assert token
    return token


@pytest.fixture(scope="session")
def onboarding_user_token():
    """Login as onboarding user."""
    login_payload = {"identifier": "sarah@example.com", "password": "password123"}
    r = requests.post(_url("/api/auth/login"), json=login_payload, timeout=5)
    assert r.status_code == 200, f"Onboarding user login failed: {r.text}"
    token = r.json().get("access_token")
    assert token
    return token


class TestAuthRouter:
    """Test /api/auth/* endpoints."""

    def test_register(self):
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "username": f"newuser_{unique_id}",
            "email": f"newuser_{unique_id}@example.com",
            "password": "NewPass123!",
            "fullName": "New User",
            "phone": "+1234567890",
        }
        r = requests.post(_url("/api/auth/register"), json=payload, timeout=5)
        assert r.status_code in (200, 201), f"Register failed: {r.text}"

    def test_login(self, user_token):
        assert user_token is not None

    def test_me(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/auth/me"), headers=headers, timeout=5)
        assert r.status_code == 200
        assert "email" in r.json()

    def test_password_reset_request(self):
        payload = {"email": "john@example.com"}
        r = requests.post(_url("/api/auth/password-reset-request"), json=payload, timeout=5)
        assert r.status_code in (200, 201)


class TestTelemetryRouter:
    """Test /api/device/telemetry/* endpoints."""

    def test_ingest_telemetry(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "deviceId": "test-device",
            "samples": [
                {
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "type": "hr",
                    "value": 75.0,
                }
            ],
        }
        r = requests.post(_url("/api/device/telemetry"), headers=headers, json=payload, timeout=5)
        assert r.status_code in (200, 201)

    def test_recent_telemetry(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/device/telemetry/recent"), headers=headers, timeout=5)
        assert r.status_code == 200


class TestAdminUsersRouter:
    """Test /api/admin/users/* endpoints."""

    def test_get_all_users(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(_url("/api/admin/users"), headers=headers, timeout=5)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_user(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "username": f"adminuser_{unique_id}",
            "email": f"adminuser_{unique_id}@example.com",
            "password": "AdminPass123!",
            "fullName": "Admin Created User",
            "phone": "+1111111111",
            "role": "user",
        }
        r = requests.post(_url("/api/admin/users/create"), headers=headers, json=payload, timeout=5)
        assert r.status_code in (200, 201)

    def test_get_users_with_mode(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(_url("/api/admin/users-with-mode"), headers=headers, timeout=5)
        assert r.status_code == 200


class TestOnboardingRouter:
    """Test onboarding endpoints."""

    def test_get_user_mode(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/user/mode"), headers=headers, timeout=5)
        assert r.status_code == 200
        assert "mode" in r.json()

    def test_shipment_tracking(self, onboarding_user_token):
        headers = {"Authorization": f"Bearer {onboarding_user_token}"}
        r = requests.get(_url("/api/shipment-tracking"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_dna_tracking(self, onboarding_user_token):
        headers = {"Authorization": f"Bearer {onboarding_user_token}"}
        r = requests.get(_url("/api/dna-tracking"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_dna_collection_request(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.post(
            _url("/api/dna-collection-request"),
            headers=headers,
            params={
                "address": "123 Test St",
                "preferredDate": "2025-12-01",
                "preferredTime": "10:00 AM",
            },
            timeout=5,
        )
        assert r.status_code in (200, 201)


class TestUserRouter:
    """Test /api/user/* endpoints."""

    def test_get_profile(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/user/profile"), headers=headers, timeout=5)
        assert r.status_code == 200
        assert "email" in r.json()

    def test_get_stats(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/user/stats"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_get_devices(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/user/devices"), headers=headers, timeout=5)
        assert r.status_code == 200


class TestProgramsRouter:
    """Test /api/programs/* endpoints."""

    def test_programs_today(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/programs/today"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_programs_upcoming(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/programs/upcoming"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_programs_history(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/programs/history"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_get_templates(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(_url("/api/admin/templates"), headers=headers, timeout=5)
        assert r.status_code == 200


class TestTicketsRouter:
    """Test /api/tickets/* endpoints."""

    def test_create_ticket(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "type": "technical",
            "subject": "Test Issue",
            "description": "This is a test ticket",
            "productId": "test-product-123",
        }
        r = requests.post(_url("/api/tickets"), headers=headers, json=payload, timeout=5)
        assert r.status_code in (200, 201)

    def test_get_my_tickets(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/tickets/my"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_get_all_tickets(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(_url("/api/tickets"), headers=headers, timeout=5)
        assert r.status_code == 200


class TestCallRequestsRouter:
    """Test /api/call-requests/* endpoints."""

    def test_create_call_request(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "requestType": "consultation",
            "preferredDate": "2025-12-01",
            "preferredTime": "14:00",
            "notes": "Need help with device setup",
        }
        r = requests.post(_url("/api/call-requests"), headers=headers, json=payload, timeout=5)
        assert r.status_code in (200, 201)

    def test_get_my_call_requests(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/call-requests/my"), headers=headers, timeout=5)
        assert r.status_code == 200


class TestReportsRouter:
    """Test /api/reports/* endpoints."""

    def test_get_my_reports(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/reports/my"), headers=headers, timeout=5)
        assert r.status_code == 200


class TestAnalyticsRouter:
    """Test /api/admin/analytics endpoint."""

    def test_get_analytics(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.get(_url("/api/admin/analytics"), headers=headers, timeout=5)
        assert r.status_code == 200
        data = r.json()
        assert "totalUsers" in data


class TestProductsRouter:
    """Test /api/admin/products/* endpoints."""

    def test_get_all_products(self):
        r = requests.get(_url("/api/admin/products"), timeout=5)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_product(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"Test Product {unique_id}",
            "description": "A test wellness device",
            "category": "Testing",
        }
        r = requests.post(_url("/api/admin/products"), headers=headers, json=payload, timeout=5)
        assert r.status_code in (200, 201)


class TestDeviceUsageRouter:
    """Test /api/device-usage/* endpoints."""

    def test_get_my_device_usage(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        r = requests.get(_url("/api/device-usage/my"), headers=headers, timeout=5)
        assert r.status_code == 200

    def test_log_device_usage(self, user_token):
        headers = {"Authorization": f"Bearer {user_token}"}
        payload = {
            "deviceType": "Cryotherapy Chamber",
            "duration": 3,
            "notes": "Great session!",
        }
        r = requests.post(_url("/api/device-usage"), headers=headers, json=payload, timeout=5)
        assert r.status_code in (200, 201)
