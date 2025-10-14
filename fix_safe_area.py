#!/usr/bin/env python3
"""
Fix white text on beige backgrounds and add safe area handling
"""

import os
import re

# Files to update
FILES_TO_UPDATE = [
    '/app/frontend/app/(tabs)/home.tsx',
    '/app/frontend/app/(tabs)/schedule.tsx',
    '/app/frontend/app/(tabs)/profile.tsx',
    '/app/frontend/app/(tabs)/contact.tsx',
    '/app/frontend/app/auth/login.tsx',
    '/app/frontend/app/auth/register.tsx',
    '/app/frontend/app/device-details.tsx',
    '/app/frontend/app/reports.tsx',
    '/app/frontend/app/schedule-test.tsx',
]

def add_safe_area_import(content):
    """Add SafeAreaView import if not present"""
    if 'SafeAreaView' in content or 'useSafeAreaInsets' in content:
        return content
    
    # Find the View import line
    view_import_pattern = r"(import\s+{[^}]*View[^}]*})"
    match = re.search(view_import_pattern, content)
    
    if match:
        # Add SafeAreaView to the import
        old_import = match.group(1)
        if 'SafeAreaView' not in old_import:
            new_import = old_import.replace('View,', 'View,\n  SafeAreaView,')
            content = content.replace(old_import, new_import)
    
    return content

def update_file(filepath):
    """Update a single file"""
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Add SafeAreaView import
        content = add_safe_area_import(content)
        
        # Add paddingBottom to contentContainerStyle in ScrollViews
        # Look for contentContainerStyle={styles.contentContainer}
        content = re.sub(
            r'contentContainerStyle={styles\.(\w+)}',
            lambda m: f'contentContainerStyle={{{{...styles.{m.group(1)}, paddingBottom: 100}}}}',
            content
        )
        
        # Check if any changes were made
        if content == original_content:
            print(f"✓ No changes needed: {filepath}")
            return True
        
        # Write updated content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Updated: {filepath}")
        return True
        
    except Exception as e:
        print(f"❌ Error updating {filepath}: {e}")
        return False

def main():
    print("🔧 Fixing white text and safe area issues...")
    print("=" * 60)
    
    success_count = 0
    for filepath in FILES_TO_UPDATE:
        if update_file(filepath):
            success_count += 1
    
    print("=" * 60)
    print(f"✨ Complete! Updated {success_count}/{len(FILES_TO_UPDATE)} files")

if __name__ == "__main__":
    main()
