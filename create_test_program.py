#!/usr/bin/env python3
"""Create fresh test programs for testing date restrictions"""

import requests
import json
from datetime import datetime, timedelta

API_BASE = "https://hybrid-health.preview.emergentagent.com/api"

def create_test_programs():
    """Create fresh programs for testing"""
    print("=== Creating Test Programs ===\n")
    
    # Login as admin
    login_data = {
        "identifier": "admin@hybridhuman.com",
        "password": "admin123"
    }
    
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
    
    admin_token = response.json()['access_token']
    
    # Get user ID
    response = requests.get(
        f"{API_BASE}/auth/me",
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    admin_id = response.json()['id']
    
    # Get john's user ID
    login_data = {
        "identifier": "john@example.com",
        "password": "password123"
    }
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    john_token = response.json()['access_token']
    
    response = requests.get(
        f"{API_BASE}/auth/me",
        headers={'Authorization': f'Bearer {john_token}'}
    )
    john_id = response.json()['id']
    
    print(f"Admin ID: {admin_id}")
    print(f"John's ID: {john_id}\n")
    
    # Create programs for today and tomorrow
    today = datetime.now().date().isoformat()
    tomorrow = (datetime.now().date() + timedelta(days=1)).isoformat()
    
    headers = {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}
    
    # Today's program
    today_program = {
        "userId": john_id,
        "title": "Today's Test Program",
        "description": "Fresh program for testing date restrictions",
        "date": today,
        "tasks": [
            {
                "title": "Test Task 1",
                "description": "This task should be completable",
                "deviceType": "Cryotherapy Chamber",
                "duration": "3 minutes"
            },
            {
                "title": "Test Task 2",
                "description": "Another completable task",
                "deviceType": "Red Light Sauna",
                "duration": "20 minutes"
            }
        ]
    }
    
    response = requests.post(f"{API_BASE}/programs", json=today_program, headers=headers)
    if response.status_code == 200:
        print(f"✅ Created today's program")
    else:
        print(f"❌ Failed to create today's program: {response.status_code}")
        print(response.text)
    
    # Tomorrow's program
    tomorrow_program = {
        "userId": john_id,
        "title": "Tomorrow's Test Program",
        "description": "Fresh program for testing date restrictions",
        "date": tomorrow,
        "tasks": [
            {
                "title": "Future Task 1",
                "description": "This task should NOT be completable today",
                "deviceType": "Compression Therapy",
                "duration": "30 minutes"
            },
            {
                "title": "Future Task 2",
                "description": "Another future task",
                "deviceType": "Cryotherapy Chamber",
                "duration": "3 minutes"
            }
        ]
    }
    
    response = requests.post(f"{API_BASE}/programs", json=tomorrow_program, headers=headers)
    if response.status_code == 200:
        print(f"✅ Created tomorrow's program")
    else:
        print(f"❌ Failed to create tomorrow's program: {response.status_code}")
        print(response.text)
    
    print("\n=== Programs Created ===")
    return True

if __name__ == "__main__":
    create_test_programs()
