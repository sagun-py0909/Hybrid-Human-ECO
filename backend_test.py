#!/usr/bin/env python3
"""
Backend API Testing for Product Selection in Machine Tickets
Testing the Hybrid Human application backend endpoints
"""

import requests
import json
import sys
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://luxury-wellness-2.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing Product Selection for Machine Tickets at: {API_BASE}")

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_user_login(self):
        """Test user login with john@example.com"""
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json={
                "identifier": "john@example.com",
                "password": "password123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.user_token = data["access_token"]
                self.session.headers.update({"Authorization": f"Bearer {self.user_token}"})
                self.log_result("User Login", True, "Successfully logged in as john@example.com")
                return True
            else:
                self.log_result("User Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("User Login", False, f"Login request failed: {str(e)}")
            return False
    
    def test_admin_login(self):
        """Test admin login"""
        try:
            # Create new session for admin
            admin_session = requests.Session()
            response = admin_session.post(f"{API_BASE}/auth/login", json={
                "identifier": "admin@hybridhuman.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.log_result("Admin Login", True, "Successfully logged in as admin")
                return True
            else:
                self.log_result("Admin Login", False, f"Admin login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Admin login request failed: {str(e)}")
            return False
    
    def test_get_user_devices(self):
        """Test getting user devices"""
        try:
            response = self.session.get(f"{API_BASE}/user/devices")
            
            if response.status_code == 200:
                data = response.json()
                devices = data.get("devices", [])
                if devices:
                    device_names = [device["name"] for device in devices]
                    self.log_result("Get User Devices", True, f"Retrieved {len(devices)} devices: {device_names}")
                    return devices
                else:
                    self.log_result("Get User Devices", False, "No devices found for user")
                    return []
            else:
                self.log_result("Get User Devices", False, f"Failed to get devices with status {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_result("Get User Devices", False, f"Get devices request failed: {str(e)}")
            return []
    
    def test_create_ticket_with_product_id(self, product_id):
        """Test creating a machine ticket with productId"""
        try:
            ticket_data = {
                "type": "machine",
                "subject": "Device malfunction test",
                "description": "The device is not working properly - testing productId feature",
                "productId": product_id
            }
            
            response = self.session.post(f"{API_BASE}/tickets", json=ticket_data)
            
            if response.status_code == 200:
                data = response.json()
                ticket_id = data.get("id")
                self.log_result("Create Ticket with ProductId", True, f"Ticket created successfully with ID: {ticket_id}")
                return ticket_id
            else:
                self.log_result("Create Ticket with ProductId", False, f"Failed to create ticket with status {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Create Ticket with ProductId", False, f"Create ticket request failed: {str(e)}")
            return None
    
    def test_create_ticket_without_product_id(self):
        """Test creating a machine ticket without productId (backward compatibility)"""
        try:
            ticket_data = {
                "type": "machine",
                "subject": "General device issue",
                "description": "Testing backward compatibility without productId"
            }
            
            response = self.session.post(f"{API_BASE}/tickets", json=ticket_data)
            
            if response.status_code == 200:
                data = response.json()
                ticket_id = data.get("id")
                self.log_result("Create Ticket without ProductId", True, f"Ticket created successfully without productId: {ticket_id}")
                return ticket_id
            else:
                self.log_result("Create Ticket without ProductId", False, f"Failed to create ticket with status {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Create Ticket without ProductId", False, f"Create ticket request failed: {str(e)}")
            return None
    
    def test_get_my_tickets(self):
        """Test retrieving user's tickets"""
        try:
            response = self.session.get(f"{API_BASE}/tickets/my")
            
            if response.status_code == 200:
                tickets = response.json()
                self.log_result("Get My Tickets", True, f"Retrieved {len(tickets)} tickets")
                
                # Check if any tickets have productId
                tickets_with_product = [t for t in tickets if t.get("productId")]
                tickets_without_product = [t for t in tickets if not t.get("productId")]
                
                print(f"   - Tickets with productId: {len(tickets_with_product)}")
                print(f"   - Tickets without productId: {len(tickets_without_product)}")
                
                return tickets
            else:
                self.log_result("Get My Tickets", False, f"Failed to get tickets with status {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_result("Get My Tickets", False, f"Get tickets request failed: {str(e)}")
            return []
    
    def test_admin_get_all_tickets(self):
        """Test admin retrieving all tickets"""
        try:
            admin_session = requests.Session()
            admin_session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
            
            response = admin_session.get(f"{API_BASE}/tickets")
            
            if response.status_code == 200:
                tickets = response.json()
                self.log_result("Admin Get All Tickets", True, f"Admin retrieved {len(tickets)} tickets")
                
                # Check if any tickets have productId
                tickets_with_product = [t for t in tickets if t.get("productId")]
                print(f"   - Admin can see {len(tickets_with_product)} tickets with productId")
                
                return tickets
            else:
                self.log_result("Admin Get All Tickets", False, f"Admin failed to get tickets with status {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_result("Admin Get All Tickets", False, f"Admin get tickets request failed: {str(e)}")
            return []
    
    def run_product_selection_tests(self):
        """Run all product selection tests"""
        print("=" * 60)
        print("TESTING PRODUCT SELECTION FOR MACHINE TICKETS")
        print("=" * 60)
        
        # Step 1: Login as regular user
        if not self.test_user_login():
            print("❌ Cannot proceed without user login")
            return False
        
        # Step 2: Login as admin
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin login")
            return False
        
        # Step 3: Get user devices
        devices = self.test_get_user_devices()
        if not devices:
            print("❌ Cannot test productId without user devices")
            return False
        
        # Step 4: Create ticket with productId
        first_device = devices[0]["name"]
        ticket_with_product = self.test_create_ticket_with_product_id(first_device)
        
        # Step 5: Create ticket without productId (backward compatibility)
        ticket_without_product = self.test_create_ticket_without_product_id()
        
        # Step 6: Retrieve user tickets
        my_tickets = self.test_get_my_tickets()
        
        # Step 7: Admin retrieve all tickets
        admin_tickets = self.test_admin_get_all_tickets()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Product selection feature is working correctly!")
            return True
        else:
            print("❌ SOME TESTS FAILED - Issues found with product selection feature")
            failed_tests = [result for result in self.test_results if not result["success"]]
            for test in failed_tests:
                print(f"   - {test['test']}: {test['message']}")
            return False

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_product_selection_tests()
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()