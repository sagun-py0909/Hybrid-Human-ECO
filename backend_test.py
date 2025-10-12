#!/usr/bin/env python3
"""
Admin Panel CRUD Operations Test Suite for Hybrid Human Application
Tests all admin authentication, users, programs, reports, tickets, call requests, and analytics endpoints
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://hybrid-human-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing Admin Panel CRUD Operations at: {API_BASE}")

class HybridHumanAPITester:
    def __init__(self):
        self.user_token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response_data': response_data
        })
        
    def make_request(self, method, endpoint, data=None, token=None, params=None):
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def test_user_login(self):
        """Test user login with demo credentials"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test with john@example.com
        login_data = {
            "identifier": "john@example.com",
            "password": "password123"
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                self.user_token = data['access_token']
                self.user_id = data['user']['id']
                self.log_test("User Login (john@example.com)", True, 
                            f"Token received, User ID: {self.user_id}")
                return True
            else:
                self.log_test("User Login (john@example.com)", False, 
                            "Missing access_token or user in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("User Login (john@example.com)", False, error_msg)
        
        return False

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "identifier": "admin@hybridhuman.com", 
            "password": "admin123"
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                self.admin_token = data['access_token']
                self.admin_id = data['user']['id']
                self.log_test("Admin Login (admin@hybridhuman.com)", True,
                            f"Token received, Admin ID: {self.admin_id}")
                return True
            else:
                self.log_test("Admin Login (admin@hybridhuman.com)", False,
                            "Missing access_token or user in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Admin Login (admin@hybridhuman.com)", False, error_msg)
        
        return False

    def test_user_registration(self):
        """Test user registration with new account"""
        timestamp = int(datetime.now().timestamp())
        register_data = {
            "username": f"testuser{timestamp}",
            "email": f"testuser{timestamp}@example.com",
            "password": "testpass123",
            "fullName": f"Test User {timestamp}",
            "phone": "+1234567890"
        }
        
        response = self.make_request('POST', '/auth/register', register_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                self.log_test("User Registration", True, 
                            f"New user created: {register_data['email']}")
                return True
            else:
                self.log_test("User Registration", False,
                            "Missing access_token or user in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("User Registration", False, error_msg)
        
        return False

    def test_auth_me(self):
        """Test /api/auth/me endpoint with valid token"""
        if not self.user_token:
            self.log_test("Auth Me Endpoint", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/auth/me', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'username' in data and 'email' in data:
                self.log_test("Auth Me Endpoint", True, 
                            f"User info retrieved: {data.get('username')}")
                return True
            else:
                self.log_test("Auth Me Endpoint", False,
                            "Missing required user fields in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Auth Me Endpoint", False, error_msg)
        
        return False

    def test_user_profile(self):
        """Test GET /api/user/profile"""
        print("\n=== USER TESTS ===")
        
        if not self.user_token:
            self.log_test("User Profile", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/user/profile', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'username' in data:
                self.log_test("User Profile", True, 
                            f"Profile retrieved for: {data.get('username')}")
                return True
            else:
                self.log_test("User Profile", False,
                            "Missing required profile fields")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("User Profile", False, error_msg)
        
        return False

    def test_user_stats(self):
        """Test GET /api/user/stats"""
        if not self.user_token:
            self.log_test("User Stats", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/user/stats', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            expected_fields = ['totalTasks', 'completedTasks', 'completionRate', 'currentStreak', 'totalDeviceUsage']
            if all(field in data for field in expected_fields):
                self.log_test("User Stats", True, 
                            f"Stats: {data['completedTasks']}/{data['totalTasks']} tasks, {data['completionRate']}% completion")
                return True
            else:
                missing = [f for f in expected_fields if f not in data]
                self.log_test("User Stats", False, f"Missing fields: {missing}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("User Stats", False, error_msg)
        
        return False

    def test_programs_today(self):
        """Test GET /api/programs/today"""
        print("\n=== PROGRAM TESTS ===")
        
        if not self.user_token:
            self.log_test("Programs Today", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/programs/today', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Programs Today", True, 
                        f"Retrieved {len(data)} programs for today")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Programs Today", False, error_msg)
        
        return False

    def test_programs_upcoming(self):
        """Test GET /api/programs/upcoming"""
        if not self.user_token:
            self.log_test("Programs Upcoming", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/programs/upcoming', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Programs Upcoming", True, 
                        f"Retrieved {len(data)} upcoming programs")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Programs Upcoming", False, error_msg)
        
        return False

    def test_programs_history(self):
        """Test GET /api/programs/history"""
        if not self.user_token:
            self.log_test("Programs History", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/programs/history', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Programs History", True, 
                        f"Retrieved {len(data)} historical programs")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Programs History", False, error_msg)
        
        return False

    def test_programs_by_date(self):
        """Test GET /api/programs/date/{date} with today's date"""
        if not self.user_token:
            self.log_test("Programs By Date", False, "No user token available")
            return False
            
        today = datetime.now().date().isoformat()
        response = self.make_request('GET', f'/programs/date/{today}', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Programs By Date", True, 
                        f"Retrieved {len(data)} programs for {today}")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Programs By Date", False, error_msg)
        
        return False

    def test_complete_task(self):
        """Test PUT /api/programs/task/complete with a valid program and task ID"""
        if not self.user_token:
            self.log_test("Complete Task", False, "No user token available")
            return False
            
        # Get upcoming programs to find an incomplete task
        response = self.make_request('GET', '/programs/upcoming', token=self.user_token)
        
        if not response or response.status_code != 200:
            self.log_test("Complete Task", False, "Could not retrieve programs to find task")
            return False
            
        programs = response.json()
        if not programs:
            self.log_test("Complete Task", False, "No programs found")
            return False
            
        # Find an incomplete task
        program_id = None
        task_id = None
        task_title = None
        
        for program in programs:
            for task in program.get('tasks', []):
                if not task.get('completed', False):
                    program_id = program['_id']
                    task_id = task['taskId']
                    task_title = task.get('title', 'Unknown task')
                    break
            if program_id:
                break
                
        if not program_id or not task_id:
            self.log_test("Complete Task", False, "No incomplete tasks found in any programs")
            return False
            
        # Complete the task
        complete_data = {
            "programId": program_id,
            "taskId": task_id
        }
        
        response = self.make_request('PUT', '/programs/task/complete', complete_data, token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'message' in data:
                self.log_test("Complete Task", True, 
                            f"Task '{task_title}' completed successfully")
                return True
            else:
                self.log_test("Complete Task", False, "No success message in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Complete Task", False, error_msg)
        
        return False

    def test_create_ticket(self):
        """Test POST /api/tickets to create a new ticket"""
        print("\n=== TICKET TESTS ===")
        
        if not self.user_token:
            self.log_test("Create Ticket", False, "No user token available")
            return False
            
        ticket_data = {
            "type": "program",
            "subject": "Test Support Ticket",
            "description": "This is a test ticket created during API testing to verify ticket creation functionality."
        }
        
        response = self.make_request('POST', '/tickets', ticket_data, token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'message' in data:
                self.log_test("Create Ticket", True, 
                            f"Ticket created: ID {data['id']}")
                return True
            else:
                self.log_test("Create Ticket", False, "Missing id or message in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Create Ticket", False, error_msg)
        
        return False

    def test_get_my_tickets(self):
        """Test GET /api/tickets/my"""
        if not self.user_token:
            self.log_test("Get My Tickets", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/tickets/my', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Get My Tickets", True, 
                        f"Retrieved {len(data)} tickets")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Get My Tickets", False, error_msg)
        
        return False

    def test_create_call_request(self):
        """Test POST /api/call-requests to create a new call request"""
        print("\n=== CALL REQUEST TESTS ===")
        
        if not self.user_token:
            self.log_test("Create Call Request", False, "No user token available")
            return False
            
        tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
        call_data = {
            "requestType": "program",
            "preferredDate": tomorrow,
            "preferredTime": "10:00 AM",
            "notes": "Test call request created during API testing"
        }
        
        response = self.make_request('POST', '/call-requests', call_data, token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'message' in data:
                self.log_test("Create Call Request", True, 
                            f"Call request created: ID {data['id']}")
                return True
            else:
                self.log_test("Create Call Request", False, "Missing id or message in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Create Call Request", False, error_msg)
        
        return False

    def test_get_my_call_requests(self):
        """Test GET /api/call-requests/my"""
        if not self.user_token:
            self.log_test("Get My Call Requests", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/call-requests/my', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Get My Call Requests", True, 
                        f"Retrieved {len(data)} call requests")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Get My Call Requests", False, error_msg)
        
        return False

    def test_get_my_device_usage(self):
        """Test GET /api/device-usage/my"""
        print("\n=== DEVICE USAGE TESTS ===")
        
        if not self.user_token:
            self.log_test("Get My Device Usage", False, "No user token available")
            return False
            
        response = self.make_request('GET', '/device-usage/my', token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Get My Device Usage", True, 
                        f"Retrieved {len(data)} device usage records")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Get My Device Usage", False, error_msg)
        
        return False

    def test_log_device_usage(self):
        """Test POST /api/device-usage to log new usage"""
        if not self.user_token:
            self.log_test("Log Device Usage", False, "No user token available")
            return False
            
        usage_data = {
            "deviceType": "Cryotherapy Chamber",
            "duration": 3,
            "notes": "Test session logged during API testing"
        }
        
        response = self.make_request('POST', '/device-usage', usage_data, token=self.user_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'message' in data:
                self.log_test("Log Device Usage", True, 
                            f"Usage logged: ID {data['id']}")
                return True
            else:
                self.log_test("Log Device Usage", False, "Missing id or message in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Log Device Usage", False, error_msg)
        
        return False

    def test_admin_get_users(self):
        """Test GET /api/admin/users"""
        print("\n=== ADMIN TESTS ===")
        
        if not self.admin_token:
            self.log_test("Admin Get Users", False, "No admin token available")
            return False
            
        response = self.make_request('GET', '/admin/users', token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Admin Get Users", True, 
                        f"Retrieved {len(data)} users")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Admin Get Users", False, error_msg)
        
        return False

    def test_admin_analytics(self):
        """Test GET /api/admin/analytics"""
        if not self.admin_token:
            self.log_test("Admin Analytics", False, "No admin token available")
            return False
            
        response = self.make_request('GET', '/admin/analytics', token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            expected_fields = ['totalUsers', 'totalAdmins', 'openTickets', 'pendingCalls']
            if all(field in data for field in expected_fields):
                self.log_test("Admin Analytics", True, 
                            f"Analytics: {data['totalUsers']} users, {data['openTickets']} open tickets")
                return True
            else:
                missing = [f for f in expected_fields if f not in data]
                self.log_test("Admin Analytics", False, f"Missing fields: {missing}")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Admin Analytics", False, error_msg)
        
        return False

    def test_admin_get_tickets(self):
        """Test GET /api/tickets (admin view)"""
        if not self.admin_token:
            self.log_test("Admin Get Tickets", False, "No admin token available")
            return False
            
        response = self.make_request('GET', '/tickets', token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Admin Get Tickets", True, 
                        f"Retrieved {len(data)} tickets (admin view)")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Admin Get Tickets", False, error_msg)
        
        return False

    def test_admin_get_call_requests(self):
        """Test GET /api/call-requests (admin view)"""
        if not self.admin_token:
            self.log_test("Admin Get Call Requests", False, "No admin token available")
            return False
            
        response = self.make_request('GET', '/call-requests', token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("Admin Get Call Requests", True, 
                        f"Retrieved {len(data)} call requests (admin view)")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Admin Get Call Requests", False, error_msg)
        
        return False

    def test_admin_update_ticket_status(self):
        """Test PUT /api/tickets/{id}/status"""
        if not self.admin_token:
            self.log_test("Admin Update Ticket Status", False, "No admin token available")
            return False
            
        # First get tickets to find one to update
        response = self.make_request('GET', '/tickets', token=self.admin_token)
        
        if not response or response.status_code != 200:
            self.log_test("Admin Update Ticket Status", False, "Could not retrieve tickets")
            return False
            
        tickets = response.json()
        if not tickets:
            self.log_test("Admin Update Ticket Status", False, "No tickets found to update")
            return False
            
        ticket_id = tickets[0]['_id']
        status_data = {"status": "in_progress"}
        
        response = self.make_request('PUT', f'/tickets/{ticket_id}/status', status_data, token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'message' in data:
                self.log_test("Admin Update Ticket Status", True, 
                            f"Ticket status updated: {data['message']}")
                return True
            else:
                self.log_test("Admin Update Ticket Status", False, "No success message in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Admin Update Ticket Status", False, error_msg)
        
        return False

    def test_admin_update_call_request_status(self):
        """Test PUT /api/call-requests/{id}/status"""
        if not self.admin_token:
            self.log_test("Admin Update Call Request Status", False, "No admin token available")
            return False
            
        # First get call requests to find one to update
        response = self.make_request('GET', '/call-requests', token=self.admin_token)
        
        if not response or response.status_code != 200:
            self.log_test("Admin Update Call Request Status", False, "Could not retrieve call requests")
            return False
            
        requests = response.json()
        if not requests:
            self.log_test("Admin Update Call Request Status", False, "No call requests found to update")
            return False
            
        request_id = requests[0]['_id']
        status_data = {"status": "scheduled"}
        
        response = self.make_request('PUT', f'/call-requests/{request_id}/status', status_data, token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'message' in data:
                self.log_test("Admin Update Call Request Status", True, 
                            f"Call request status updated: {data['message']}")
                return True
            else:
                self.log_test("Admin Update Call Request Status", False, "No success message in response")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_test("Admin Update Call Request Status", False, error_msg)
        
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Hybrid Human API Tests")
        print("=" * 50)
        
        # Authentication Tests
        self.test_user_login()
        self.test_admin_login()
        self.test_user_registration()
        self.test_auth_me()
        
        # User Tests
        self.test_user_profile()
        self.test_user_stats()
        
        # Program Tests
        self.test_programs_today()
        self.test_programs_upcoming()
        self.test_programs_history()
        self.test_programs_by_date()
        self.test_complete_task()
        
        # Ticket Tests
        self.test_create_ticket()
        self.test_get_my_tickets()
        
        # Call Request Tests
        self.test_create_call_request()
        self.test_get_my_call_requests()
        
        # Device Usage Tests
        self.test_get_my_device_usage()
        self.test_log_device_usage()
        
        # Admin Tests
        self.test_admin_get_users()
        self.test_admin_analytics()
        self.test_admin_get_tickets()
        self.test_admin_get_call_requests()
        self.test_admin_update_ticket_status()
        self.test_admin_update_call_request_status()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("🏁 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.test_results:
            if result['success']:
                print(f"  - {result['test']}")

if __name__ == "__main__":
    tester = HybridHumanAPITester()
    tester.run_all_tests()