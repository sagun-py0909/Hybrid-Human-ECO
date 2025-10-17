#!/usr/bin/env python3
"""
Script to update color scheme across all Expo app screens
From: Dark theme (black, dark grays)
To: Beige theme (#FAF0DC beige background, olive green accents, black text)
"""

import os
import re

# Color mappings (old -> new)
COLOR_MAPPINGS = {
    # Backgrounds
    "'#0A0A0A'": "'#FAF0DC'",  # Main background
    '"#0A0A0A"': '"#FAF0DC"',
    "'#1A1A1A'": "'#FFFFFF'",  # Card backgrounds
    '"#1A1A1A"': '"#FFFFFF"',
    "'#2A2A2A'": "'#F0E6D0'",  # Secondary backgrounds
    '"#2A2A2A"': '"#F0E6D0"',
    "'#3A3A3A'": "'#E0D5C0'",  # Tertiary backgrounds
    '"#3A3A3A"': '"#E0D5C0"',
    
    # Text colors
    "'#E8E8E8'": "'#1A1A1A'",  # Primary text
    '"#E8E8E8"': '"#1A1A1A"',
    "'#999'": "'#4A4A4A'",  # Secondary text
    '"#999"': '"#4A4A4A"',
    "'#666'": "'#888'",  # Placeholder text
    '"#666"': '"#888"',
    "'#CCC'": "'#AAA'",  # Disabled text
    '"#CCC"': '"#AAA"',
    
    # Borders
    "'#2A2A2A'": "'#D0C5B0'",  # Primary border
    '"#2A2A2A"': '"#D0C5B0"',
    
    # Keep these colors (already correct)
    # '#556B2F' - Dark olive green
    # '#8FBC8F' - Light olive green
    # '#FF6B35' - Alert orange
    # '#4ECDC4' - Teal
    # '#FFD700' - Gold
    # '#FFF' - White (for text on dark backgrounds)
}

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

def update_file_colors(filepath):
    """Update colors in a single file"""
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply color mappings
        for old_color, new_color in COLOR_MAPPINGS.items():
            content = content.replace(old_color, new_color)
        
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
    print("🎨 Updating color scheme across Hybrid Human app...")
    print("=" * 60)
    
    success_count = 0
    for filepath in FILES_TO_UPDATE:
        if update_file_colors(filepath):
            success_count += 1
    
    print("=" * 60)
    print(f"✨ Complete! Updated {success_count}/{len(FILES_TO_UPDATE)} files")
    print("\nNew Color Scheme:")
    print("  Background: #FAF0DC (Beige)")
    print("  Cards: #FFFFFF (White)")
    print("  Text: #1A1A1A (Black)")
    print("  Accents: #556B2F, #8FBC8F (Olive Green)")

if __name__ == "__main__":
    main()
