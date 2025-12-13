#!/bin/bash

echo "🛑 עוצר תהליכים ישנים..."
pkill -9 -f "node server.js" 2>/dev/null
sleep 1

echo "🗑️  מוחק session ישן (תצטרך לסרוק QR מחדש)..."
rm -rf .wwebjs_auth .wwebjs_cache
sleep 1

echo "🚀 מפעיל את הבוט - תראה QR code..."
node server.js
