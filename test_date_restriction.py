#!/usr/bin/env python3
"""Test that task completion is restricted to today's date only"""

import requests
import json
from datetime import datetime, timedelta
import sys

API_BASE = "https://luxury-wellness-2.preview.emergentagent.com/api"

def test_date_restriction():
    """Test task completion date restriction"""
    print("=== Testing Task Completion Date Restriction ===\n")
    
    # Login as user
    login_data = {
        "identifier": "john@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
    
    token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print("✅ Logged in successfully\n")
    
    # Get today's date and tomorrow's date
    today = datetime.now().date().isoformat()
    tomorrow = (datetime.now().date() + timedelta(days=1)).isoformat()
    
    print(f"Today: {today}")
    print(f"Tomorrow: {tomorrow}\n")
    
    # Get today's programs
    response = requests.get(f"{API_BASE}/programs/date/{today}", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get today's programs: {response.status_code}")
        return False
    
    today_programs = response.json()
    print(f"Found {len(today_programs)} programs for today")
    
    # Find an incomplete task for today
    today_incomplete_task = None
    for program in today_programs:
        for task in program.get('tasks', []):
            if not task.get('completed'):
                today_incomplete_task = (program['_id'], task['taskId'])
                print(f"✅ Found incomplete task for today: {task['title']}")
                break
        if today_incomplete_task:
            break
    
    # Get tomorrow's programs
    response = requests.get(f"{API_BASE}/programs/date/{tomorrow}", headers=headers)
    tomorrow_programs = response.json() if response.status_code == 200 else []
    print(f"Found {len(tomorrow_programs)} programs for tomorrow\n")
    
    # Find an incomplete task for tomorrow
    tomorrow_incomplete_task = None
    for program in tomorrow_programs:
        for task in program.get('tasks', []):
            if not task.get('completed'):
                tomorrow_incomplete_task = (program['_id'], task['taskId'])
                print(f"✅ Found incomplete task for tomorrow: {task['title']}")
                break
        if tomorrow_incomplete_task:
            break
    
    print("\n--- Testing Task Completion ---\n")
    
    # Test 1: Complete today's task (should succeed)
    if today_incomplete_task:
        print("Test 1: Completing today's task (should succeed)")
        response = requests.put(
            f"{API_BASE}/programs/task/complete",
            json={"programId": today_incomplete_task[0], "taskId": today_incomplete_task[1]},
            headers=headers
        )
        if response.status_code == 200:
            print("✅ Successfully completed today's task")
        else:
            print(f"❌ Failed to complete today's task: {response.status_code}")
            print(f"   Response: {response.text}")
    else:
        print("⚠️  No incomplete tasks found for today to test")
    
    print()
    
    # Test 2: Try to complete tomorrow's task (should fail)
    if tomorrow_incomplete_task:
        print("Test 2: Attempting to complete tomorrow's task (should be blocked)")
        response = requests.put(
            f"{API_BASE}/programs/task/complete",
            json={"programId": tomorrow_incomplete_task[0], "taskId": tomorrow_incomplete_task[1]},
            headers=headers
        )
        if response.status_code == 400:
            error_detail = response.json().get('detail', '')
            print(f"✅ Correctly blocked: {error_detail}")
        else:
            print(f"❌ Should have been blocked but got: {response.status_code}")
            print(f"   Response: {response.text}")
    else:
        print("⚠️  No incomplete tasks found for tomorrow to test")
    
    print("\n=== Test Complete ===")
    return True

if __name__ == "__main__":
    success = test_date_restriction()
    sys.exit(0 if success else 1)
