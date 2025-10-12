#!/usr/bin/env python3
"""
Check all programs to find incomplete tasks
"""

import requests
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://hybrid-human-1.preview.emergentagent.com')
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

def check_all_programs():
    """Check all programs for incomplete tasks"""
    token = login_user()
    if not token:
        print("Failed to login")
        return
        
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Get upcoming programs
    response = requests.get(f"{API_BASE}/programs/upcoming", headers=headers)
    
    if response.status_code == 200:
        programs = response.json()
        print(f"Found {len(programs)} upcoming programs")
        
        for i, program in enumerate(programs):
            print(f"\nProgram {i+1}: {program.get('title', 'No title')} - Date: {program.get('date')}")
            print(f"Program ID: {program.get('_id')}")
            
            tasks = program.get('tasks', [])
            incomplete_tasks = []
            
            for j, task in enumerate(tasks):
                completed = task.get('completed', False)
                task_id = task.get('taskId')
                title = task.get('title', 'No title')
                print(f"  Task {j+1}: {title} (ID: {task_id}) - Completed: {completed}")
                
                if not completed:
                    incomplete_tasks.append((program.get('_id'), task_id, title))
            
            if incomplete_tasks:
                print(f"  -> Found {len(incomplete_tasks)} incomplete tasks!")
                return incomplete_tasks[0]  # Return first incomplete task
    else:
        print(f"Failed to get programs: {response.status_code}")
        print(response.text)
    
    return None, None, None

if __name__ == "__main__":
    program_id, task_id, task_title = check_all_programs()
    
    if program_id and task_id:
        print(f"\nFound incomplete task to test: '{task_title}' in program {program_id}")
    else:
        print("\nNo incomplete tasks found in any programs")