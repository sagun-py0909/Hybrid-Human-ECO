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
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://hybrid-health.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing Admin Panel CRUD Operations at: {API_BASE}")

class AdminPanelCRUDTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.john_user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, token=None):
        """Make HTTP request with proper headers"""
        url = f"{API_BASE}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
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
    
    def admin_login(self):
        """Test admin authentication"""
        try:
            response = self.make_request('POST', '/auth/login', {
                "identifier": "admin@hybridhuman.com",
                "password": "admin123"
            })
            
            if response and response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                admin_role = data["user"]["role"]
                
                if admin_role == "admin":
                    self.log_result("Admin Authentication", True, f"Admin logged in successfully with role: {admin_role}")
                    return True
                else:
                    self.log_result("Admin Authentication", False, f"User role is {admin_role}, not admin")
                    return False
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Admin Authentication", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception: {str(e)}")
            return False
    
    def user_login(self):
        """Login as regular user (John) for testing"""
        try:
            response = self.make_request('POST', '/auth/login', {
                "identifier": "john@example.com",
                "password": "password123"
            })
            
            if response and response.status_code == 200:
                data = response.json()
                self.user_token = data["access_token"]
                self.john_user_id = data["user"]["id"]
                self.log_result("User Login (John)", True, f"John logged in, user_id: {self.john_user_id}")
                return True
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("User Login (John)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("User Login (John)", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_users_read(self):
        """Test GET /api/admin/users - List all users"""
        try:
            response = self.make_request('GET', '/admin/users', token=self.admin_token)
            
            if response and response.status_code == 200:
                users = response.json()
                user_count = len(users)
                admin_found = any(user.get("role") == "admin" for user in users)
                john_found = any(user.get("email") == "john@example.com" for user in users)
                
                if admin_found and john_found:
                    self.log_result("Admin Users List (READ)", True, f"Found {user_count} users including admin and John")
                    return True
                else:
                    self.log_result("Admin Users List (READ)", False, f"Missing expected users - admin: {admin_found}, john: {john_found}")
                    return False
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Admin Users List (READ)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Admin Users List (READ)", False, f"Exception: {str(e)}")
            return False
    
    def test_user_progress_read(self):
        """Test GET /api/admin/user/{user_id}/progress - Get detailed progress for John"""
        try:
            response = self.make_request('GET', f'/admin/user/{self.john_user_id}/progress', token=self.admin_token)
            
            if response and response.status_code == 200:
                progress = response.json()
                required_fields = ["user", "stats", "taskHistory", "programCount"]
                
                if all(field in progress for field in required_fields):
                    stats = progress["stats"]
                    task_count = stats.get("totalTasks", 0)
                    completion_rate = stats.get("completionRate", 0)
                    
                    # Check CSV export format - the data should be structured for CSV export
                    csv_exportable = isinstance(progress["taskHistory"], list) and len(progress["taskHistory"]) > 0
                    
                    self.log_result("User Progress (READ)", True, 
                                  f"Progress data retrieved - Tasks: {task_count}, Completion: {completion_rate}%, CSV exportable: {csv_exportable}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in progress]
                    self.log_result("User Progress (READ)", False, f"Missing fields: {missing}")
                    return False
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("User Progress (READ)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("User Progress (READ)", False, f"Exception: {str(e)}")
            return False
    
    def test_user_role_update(self):
        """Test PUT /api/admin/users/{user_id}/role - Change a user's role"""
        try:
            # First, change John's role to admin
            response = self.make_request('PUT', f'/admin/users/{self.john_user_id}/role', 
                                      {"role": "admin"}, token=self.admin_token)
            
            if response and response.status_code == 200:
                # Verify the role was changed by getting user list
                users_response = self.make_request('GET', '/admin/users', token=self.admin_token)
                if users_response and users_response.status_code == 200:
                    users = users_response.json()
                    john_user = next((u for u in users if u["_id"] == self.john_user_id), None)
                    
                    if john_user and john_user.get("role") == "admin":
                        # Change back to user
                        restore_response = self.make_request('PUT', f'/admin/users/{self.john_user_id}/role', 
                                                      {"role": "user"}, token=self.admin_token)
                        
                        if restore_response and restore_response.status_code == 200:
                            self.log_result("User Role Update (UPDATE)", True, "Successfully changed role to admin and back to user")
                            return True
                        else:
                            self.log_result("User Role Update (UPDATE)", False, "Failed to restore user role")
                            return False
                    else:
                        self.log_result("User Role Update (UPDATE)", False, "Role change not reflected in user data")
                        return False
                else:
                    self.log_result("User Role Update (UPDATE)", False, "Failed to verify role change")
                    return False
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("User Role Update (UPDATE)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("User Role Update (UPDATE)", False, f"Exception: {str(e)}")
            return False
    
    def test_program_templates_read(self):
        """Test GET /api/admin/templates - Get program templates"""
        try:
            response = self.make_request('GET', '/admin/templates', token=self.admin_token)
            
            if response and response.status_code == 200:
                templates = response.json()
                
                if isinstance(templates, list) and len(templates) > 0:
                    # Look for the "Complete Wellness Protocol" template
                    wellness_template = next((t for t in templates if "Complete Wellness Protocol" in t.get("name", "")), None)
                    
                    if wellness_template:
                        self.log_result("Program Templates (READ)", True, 
                                      f"Found {len(templates)} templates including 'Complete Wellness Protocol'")
                        return wellness_template
                    else:
                        self.log_result("Program Templates (READ)", False, "Complete Wellness Protocol template not found")
                        return None
                else:
                    self.log_result("Program Templates (READ)", False, "No templates found")
                    return None
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Program Templates (READ)", False, error_msg)
                return None
                
        except Exception as e:
            self.log_result("Program Templates (READ)", False, f"Exception: {str(e)}")
            return None
    
    def test_bulk_program_create(self, template):
        """Test POST /api/admin/programs/bulk - Create bulk programs"""
        try:
            # Calculate tomorrow's date
            tomorrow = (datetime.now() + timedelta(days=1)).date().isoformat()
            
            # Prepare bulk program data
            bulk_data = {
                "userIds": [self.john_user_id],
                "title": template["name"],
                "description": template["description"],
                "tasks": template["tasks"],
                "startDate": tomorrow,
                "weeks": 1  # 1 week = 7 days
            }
            
            response = self.make_request('POST', '/admin/programs/bulk', bulk_data, token=self.admin_token)
            
            if response and response.status_code == 200:
                result = response.json()
                programs_created = result.get("programsCreated", 0)
                users_assigned = result.get("usersAssigned", 0)
                
                if programs_created == 7 and users_assigned == 1:  # 7 days for 1 user
                    # Verify programs were created by checking user's programs
                    user_programs_response = self.make_request('GET', f'/programs/user/{self.john_user_id}', token=self.admin_token)
                    
                    if user_programs_response and user_programs_response.status_code == 200:
                        self.log_result("Bulk Program Create (CREATE)", True, 
                                      f"Created {programs_created} programs for {users_assigned} user starting {tomorrow}")
                        return True
                    else:
                        self.log_result("Bulk Program Create (CREATE)", False, "Programs created but verification failed")
                        return False
                else:
                    self.log_result("Bulk Program Create (CREATE)", False, 
                                  f"Unexpected counts - programs: {programs_created}, users: {users_assigned}")
                    return False
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Bulk Program Create (CREATE)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Bulk Program Create (CREATE)", False, f"Exception: {str(e)}")
            return False
    
    def test_report_upload(self):
        """Test POST /api/admin/reports/upload - Upload a report"""
        try:
            # Create a small base64 PDF (mock PDF content)
            pdf_content = b"Mock PDF content for testing purposes"
            pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            
            report_data = {
                "userId": self.john_user_id,
                "title": "Test Report",
                "reportType": "wellness",
                "pdfData": pdf_base64
            }
            
            response = self.make_request('POST', '/admin/reports/upload', report_data, token=self.admin_token)
            
            if response and response.status_code == 200:
                result = response.json()
                report_id = result.get("id")
                
                if report_id:
                    self.log_result("Report Upload (CREATE)", True, f"Report uploaded successfully with ID: {report_id}")
                    return report_id
                else:
                    self.log_result("Report Upload (CREATE)", False, "Report uploaded but no ID returned")
                    return None
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Report Upload (CREATE)", False, error_msg)
                return None
                
        except Exception as e:
            self.log_result("Report Upload (CREATE)", False, f"Exception: {str(e)}")
            return None
    
    def test_user_reports_read(self):
        """Test GET /api/reports/my (as John) - Verify report appears"""
        try:
            response = self.make_request('GET', '/reports/my', token=self.user_token)
            
            if response and response.status_code == 200:
                reports = response.json()
                
                # Look for the "Test Report" we just uploaded
                test_report = next((r for r in reports if r.get("title") == "Test Report"), None)
                
                if test_report:
                    self.log_result("User Reports Read (READ)", True, "Test report found in user's reports")
                    return True
                else:
                    self.log_result("User Reports Read (READ)", False, "Test report not found in user's reports")
                    return False
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("User Reports Read (READ)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("User Reports Read (READ)", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_tickets_read(self):
        """Test GET /api/admin/tickets - Get all tickets"""
        try:
            response = self.make_request('GET', '/tickets', token=self.admin_token)
            
            if response and response.status_code == 200:
                tickets = response.json()
                ticket_count = len(tickets)
                
                self.log_result("Admin Tickets Read (READ)", True, f"Retrieved {ticket_count} tickets")
                return tickets
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Admin Tickets Read (READ)", False, error_msg)
                return []
                
        except Exception as e:
            self.log_result("Admin Tickets Read (READ)", False, f"Exception: {str(e)}")
            return []
    
    def test_ticket_status_update(self, tickets):
        """Test PUT /api/tickets/{id}/status - Update ticket status"""
        try:
            if not tickets:
                # Create a test ticket first
                ticket_data = {
                    "type": "program",
                    "subject": "Test Ticket for Status Update",
                    "description": "This is a test ticket for status update testing"
                }
                
                create_response = self.make_request('POST', '/tickets', ticket_data, token=self.user_token)
                if create_response and create_response.status_code == 200:
                    ticket_id = create_response.json().get("id")
                else:
                    self.log_result("Ticket Status Update (UPDATE)", False, "Failed to create test ticket")
                    return False
            else:
                ticket_id = tickets[0].get("_id")
            
            # Update to "in_progress"
            response1 = self.make_request('PUT', f'/tickets/{ticket_id}/status', 
                                       {"status": "in_progress"}, token=self.admin_token)
            
            if response1 and response1.status_code == 200:
                # Update to "resolved"
                response2 = self.make_request('PUT', f'/tickets/{ticket_id}/status', 
                                           {"status": "resolved"}, token=self.admin_token)
                
                if response2 and response2.status_code == 200:
                    self.log_result("Ticket Status Update (UPDATE)", True, "Successfully updated ticket status to in_progress then resolved")
                    return True
                else:
                    error_msg = f"Status: {response2.status_code if response2 else 'No response'}"
                    if response2:
                        try:
                            error_msg += f", Error: {response2.json()}"
                        except:
                            error_msg += f", Text: {response2.text}"
                    self.log_result("Ticket Status Update (UPDATE)", False, f"Failed to update to resolved: {error_msg}")
                    return False
            else:
                error_msg = f"Status: {response1.status_code if response1 else 'No response'}"
                if response1:
                    try:
                        error_msg += f", Error: {response1.json()}"
                    except:
                        error_msg += f", Text: {response1.text}"
                self.log_result("Ticket Status Update (UPDATE)", False, f"Failed to update to in_progress: {error_msg}")
                return False
                
        except Exception as e:
            self.log_result("Ticket Status Update (UPDATE)", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_call_requests_read(self):
        """Test GET /api/admin/call-requests - Get all call requests"""
        try:
            response = self.make_request('GET', '/call-requests', token=self.admin_token)
            
            if response and response.status_code == 200:
                call_requests = response.json()
                request_count = len(call_requests)
                
                self.log_result("Admin Call Requests Read (READ)", True, f"Retrieved {request_count} call requests")
                return call_requests
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Admin Call Requests Read (READ)", False, error_msg)
                return []
                
        except Exception as e:
            self.log_result("Admin Call Requests Read (READ)", False, f"Exception: {str(e)}")
            return []
    
    def test_call_request_status_update(self, call_requests):
        """Test PUT /api/call-requests/{id}/status - Update call request status"""
        try:
            if not call_requests:
                # Create a test call request first
                call_data = {
                    "requestType": "program",
                    "preferredDate": "2024-12-20",
                    "preferredTime": "10:00 AM",
                    "notes": "Test call request for status update testing"
                }
                
                create_response = self.make_request('POST', '/call-requests', call_data, token=self.user_token)
                if create_response and create_response.status_code == 200:
                    request_id = create_response.json().get("id")
                else:
                    self.log_result("Call Request Status Update (UPDATE)", False, "Failed to create test call request")
                    return False
            else:
                request_id = call_requests[0].get("_id")
            
            # Update to "scheduled"
            response1 = self.make_request('PUT', f'/call-requests/{request_id}/status', 
                                       {"status": "scheduled"}, token=self.admin_token)
            
            if response1 and response1.status_code == 200:
                # Update to "completed"
                response2 = self.make_request('PUT', f'/call-requests/{request_id}/status', 
                                           {"status": "completed"}, token=self.admin_token)
                
                if response2 and response2.status_code == 200:
                    self.log_result("Call Request Status Update (UPDATE)", True, "Successfully updated call request status to scheduled then completed")
                    return True
                else:
                    error_msg = f"Status: {response2.status_code if response2 else 'No response'}"
                    if response2:
                        try:
                            error_msg += f", Error: {response2.json()}"
                        except:
                            error_msg += f", Text: {response2.text}"
                    self.log_result("Call Request Status Update (UPDATE)", False, f"Failed to update to completed: {error_msg}")
                    return False
            else:
                error_msg = f"Status: {response1.status_code if response1 else 'No response'}"
                if response1:
                    try:
                        error_msg += f", Error: {response1.json()}"
                    except:
                        error_msg += f", Text: {response1.text}"
                self.log_result("Call Request Status Update (UPDATE)", False, f"Failed to update to scheduled: {error_msg}")
                return False
                
        except Exception as e:
            self.log_result("Call Request Status Update (UPDATE)", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_analytics(self):
        """Test GET /api/admin/analytics - Verify all counts are returned"""
        try:
            response = self.make_request('GET', '/admin/analytics', token=self.admin_token)
            
            if response and response.status_code == 200:
                analytics = response.json()
                required_fields = ["totalUsers", "totalAdmins", "openTickets", "pendingCalls", "totalPrograms", "recentUsers"]
                
                if all(field in analytics for field in required_fields):
                    counts = {field: analytics[field] for field in required_fields[:-1]}  # Exclude recentUsers
                    recent_users_count = len(analytics["recentUsers"])
                    
                    self.log_result("Admin Analytics (READ)", True, 
                                  f"Analytics retrieved - {counts}, Recent users: {recent_users_count}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in analytics]
                    self.log_result("Admin Analytics (READ)", False, f"Missing fields: {missing}")
                    return False
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_result("Admin Analytics (READ)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Admin Analytics (READ)", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all admin panel CRUD tests"""
        print("=" * 80)
        print("ADMIN PANEL CRUD OPERATIONS TEST SUITE")
        print("=" * 80)
        
        # Step 1: Authentication
        print("\n1. AUTHENTICATION TESTS")
        print("-" * 40)
        if not self.admin_login():
            print("❌ Admin login failed - cannot proceed with admin tests")
            return False
        
        if not self.user_login():
            print("❌ User login failed - some tests may not work")
        
        # Step 2: Users Management
        print("\n2. USERS MANAGEMENT TESTS")
        print("-" * 40)
        self.test_admin_users_read()
        self.test_user_progress_read()
        self.test_user_role_update()
        
        # Step 3: Programs Management
        print("\n3. PROGRAMS MANAGEMENT TESTS")
        print("-" * 40)
        template = self.test_program_templates_read()
        if template:
            self.test_bulk_program_create(template)
        
        # Step 4: Reports Management
        print("\n4. REPORTS MANAGEMENT TESTS")
        print("-" * 40)
        self.test_report_upload()
        if self.user_token:
            self.test_user_reports_read()
        
        # Step 5: Tickets Management
        print("\n5. TICKETS MANAGEMENT TESTS")
        print("-" * 40)
        tickets = self.test_admin_tickets_read()
        self.test_ticket_status_update(tickets)
        
        # Step 6: Call Requests Management
        print("\n6. CALL REQUESTS MANAGEMENT TESTS")
        print("-" * 40)
        call_requests = self.test_admin_call_requests_read()
        self.test_call_request_status_update(call_requests)
        
        # Step 7: Analytics
        print("\n7. ANALYTICS TESTS")
        print("-" * 40)
        self.test_admin_analytics()
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST RESULTS SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
        
        print(f"\nOVERALL: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL ADMIN PANEL CRUD OPERATIONS WORKING CORRECTLY!")
            return True
        else:
            print(f"⚠️  {total-passed} tests failed - see details above")
            return False

if __name__ == "__main__":
    tester = AdminPanelCRUDTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)