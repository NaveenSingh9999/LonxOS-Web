#!/bin/bash
# LonxOS Filesystem Hierarchy Demo Script
# This script demonstrates the new Linux-like filesystem structure and default app support

echo "🚀 LonxOS Filesystem Hierarchy Upgrade Demo"
echo "============================================="
echo ""

echo "📁 1. New Directory Structure:"
echo "------------------------------"
ls /
echo ""

echo "🏠 2. User Home Directory Structure:"
echo "-----------------------------------"
ls /home/user
echo ""

echo "⚙️  3. System Settings (/dec/settings/):"
echo "---------------------------------------"
ls /dec/settings/
echo ""

echo "📋 4. Current Default Applications:"
echo "---------------------------------"
settings get defaultApps
echo ""

echo "🔧 5. Setting a new default app for .md files:"
echo "----------------------------------------------"
settings set defaultApps.md "nano"
echo "✓ Set nano as default for .md files"
echo ""

echo "📝 6. Creating a test file:"
echo "-------------------------"
echo "# Hello LonxOS" > /home/user/Desktop/test.md
echo "This is a test markdown file." >> /home/user/Desktop/test.md
echo "✓ Created /home/user/Desktop/test.md"
echo ""

echo "📂 7. Desktop contents:"
echo "----------------------"
ls /home/user/Desktop/
echo ""

echo "🔍 8. Testing default app resolution:"
echo "------------------------------------"
xdg-mime query default .md
echo ""

echo "📦 9. Creating Downloads directory structure:"
echo "--------------------------------------------"
mkdir -p /home/user/Downloads/packages
mkdir -p /home/user/Downloads/media
ls /home/user/Downloads/
echo ""

echo "⚡ 10. Testing the 'open' command:"
echo "--------------------------------"
echo "This would open test.md with nano:"
echo "$ open /home/user/Desktop/test.md"
echo ""

echo "🎯 Demo Complete!"
echo "================"
echo "New features available:"
echo "• Linux-like directory structure (/bin, /boot, /dev, /etc, /home, /lib, /dec, /tmp, /var, /usr)"
echo "• Default application support (open, xdg-open, xdg-mime)"
echo "• System settings management (settings get/set/list)"
echo "• Desktop and Downloads directories"
echo "• Enhanced MIM package manager with Downloads backup"
echo ""
echo "Try these commands:"
echo "• ls /              - See the new directory structure"
echo "• settings list     - View all system settings"
echo "• open filename.txt - Open files with default apps"
echo "• xdg-mime default nano .txt - Set default apps"
echo "• mkdir /tmp/test   - Create directories"
