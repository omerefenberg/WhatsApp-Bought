#!/bin/bash

echo "🛑 עוצר תהליכים ישנים..."
pkill -9 -f "node server.js" 2>/dev/null
sleep 1

echo "🧹 מנקה cache (לא session)..."
rm -rf .wwebjs_cache
sleep 1

echo "🚀 מפעיל את הבוט..."
node server.js
