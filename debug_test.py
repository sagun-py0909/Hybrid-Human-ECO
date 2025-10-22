#!/usr/bin/env python3
"""
Debug script to investigate the failed tests
"""

import requests
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://luxury-wellness-2.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

def login_user():
    """Login and get token"""
    login_data = {
        "identifier": "john@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data['access_token']
    return None

def debug_task_completion():
    """Debug task completion issue"""
    token = login_user()
    if not token:
        print("Failed to login")
        return
        
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Get today's programs
    today = datetime.now().date().isoformat()
    response = requests.get(f"{API_BASE}/programs/date/{today}", headers=headers)
    
    if response.status_code == 200:
        programs = response.json()
        print(f"Found {len(programs)} programs for today")
        
        for i, program in enumerate(programs):
            print(f"\nProgram {i+1}: {program.get('title', 'No title')}")
            print(f"Program ID: {program.get('_id')}")
            
            tasks = program.get('tasks', [])
            print(f"Tasks ({len(tasks)}):")
            
            for j, task in enumerate(tasks):
                completed = task.get('completed', False)
                task_id = task.get('taskId')
                title = task.get('title', 'No title')
                print(f"  Task {j+1}: {title} (ID: {task_id}) - Completed: {completed}")
                
                if not completed:
                    print(f"    -> This task can be completed!")
                    return program.get('_id'), task_id
    else:
        print(f"Failed to get programs: {response.status_code}")
        print(response.text)
    
    return None, None

def debug_device_usage():
    """Debug device usage logging issue"""
    token = login_user()
    if not token:
        print("Failed to login")
        return
        
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Try to log device usage
    usage_data = {
        "deviceType": "Cryotherapy Chamber",
        "duration": 3,
        "notes": "Test session logged during API testing"
    }
    
    print(f"Attempting to log device usage: {usage_data}")
    
    response = requests.post(f"{API_BASE}/device-usage", json=usage_data, headers=headers)
    
    print(f"Response status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    
    try:
        print(f"Response JSON: {response.json()}")
    except:
        print(f"Response text: {response.text}")

if __name__ == "__main__":
    print("=== Debugging Task Completion ===")
    program_id, task_id = debug_task_completion()
    
    if program_id and task_id:
        print(f"\nFound incomplete task - Program: {program_id}, Task: {task_id}")
    else:
        print("\nNo incomplete tasks found")
    
    print("\n=== Debugging Device Usage ===")
    debug_device_usage()