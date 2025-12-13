# 🔄 מדריך איפוס המערכת - Reset Guide

## סקירה כללית

מדריך זה מסביר כיצד לאפס לחלוטין את מערכת הבוט והדאטאבייס, ולהתחיל מחדש.

## 🎯 מתי להשתמש באיפוס?

- רוצה להתחיל עם נתונים נקיים
- יש בעיות עם נתונים מוזרים או לא תקינים
- רוצה לבדוק את המערכת מאפס
- עובר למשתמש חדש / פרויקט חדש

---

## 📝 סוגי איפוס

### 1. **איפוס מלא (מומלץ)** - Full Reset

מוחק **הכל**: נתונים + WhatsApp session

```bash
cd bought-finance-bot
./full-reset.sh
```

**מה זה מוחק:**
- ✅ כל הטרנזקציות
- ✅ כל התקציבים
- ✅ כל היעדים
- ✅ WhatsApp session (תצטרך לסרוק QR מחדש)

---

### 2. **איפוס רק של הדאטאבייס** - Database Only

מוחק רק את הנתונים, משאיר את ה-WhatsApp session

```bash
cd bought-finance-bot
node reset-database.js
```

**מה זה מוחק:**
- ✅ כל הטרנזקציות
- ✅ כל התקציבים
- ✅ כל היעדים
- ❌ WhatsApp session נשאר (לא צריך לסרוק QR מחדש)

---

### 3. **איפוס רק של WhatsApp Session**

מוחק רק את ה-session, משאיר את הנתונים

```bash
cd bought-finance-bot
./fresh-start.sh
```

**מה זה מוחק:**
- ❌ טרנזקציות נשארות
- ❌ תקציבים נשארים
- ❌ יעדים נשארים
- ✅ WhatsApp session (תצטרך לסרוק QR מחדש)

---

## 🚀 תהליך איפוס מלא - צעד אחר צעד

### שלב 1: עצירת הבוט

אם הבוט רץ, עצור אותו:
```bash
# מצא תהליכים רצים
ps aux | grep "node server.js"

# עצור אותם
pkill -f "node server.js"
```

או פשוט סגור את החלון של הטרמינל שמריץ את הבוט.

---

### שלב 2: הרץ איפוס מלא

```bash
cd bought-finance-bot
./full-reset.sh
```

תתבקש לאשר:
```
❓ האם אתה בטוח שברצונך להמשיך? (כתוב 'כן' או 'yes'):
```

כתוב `כן` או `yes` ולחץ Enter.

---

### שלב 3: הפעל את הבוט מחדש

```bash
npm start
```

תראה QR code - סרוק אותו עם WhatsApp שלך.

---

### שלב 4: התחל להשתמש!

1. **הגדר תקציב חדש:**
   ```
   /תקציב
   ```

2. **צור יעד חדש (אופציונלי):**
   ```
   /יעד
   ```

3. **התחל לרשום הוצאות:**
   ```
   קניתי קפה 15
   ```

---

## 📊 בדיקה שהאיפוס עבד

### בדוק את הדאטאבייס:

```bash
# פתח MongoDB Compass או Atlas
# או בדוק דרך API:
curl http://localhost:3001/api/transactions?limit=5
curl http://localhost:3001/api/goals
```

אמור להחזיר רשימות ריקות או שגיאה 404.

### בדוק את הדאשבורד:

1. פתח את הדאשבורד:
   ```
   cd bought-dashboard
   npm start
   ```

2. פתח בדפדפן: `http://localhost:3000`

3. אמור לראות נתונים ריקים / אפסים

---

## ⚠️ אזהרות חשובות

### 🔴 פעולה בלתי הפיכה!

לאחר האיפוס, **לא ניתן** לשחזר את הנתונים הישנים.
אם אתה לא בטוח - עדיף **לא** לעשות איפוס.

### 💾 גיבוי (אם רוצה)

לפני איפוס, אפשר לעשות גיבוי של הדאטאבייס:

```bash
# אם יש לך mongoexport מותקן:
mongoexport --uri="YOUR_MONGO_URI" --collection=transactions --out=transactions-backup.json
mongoexport --uri="YOUR_MONGO_URI" --collection=budgets --out=budgets-backup.json
mongoexport --uri="YOUR_MONGO_URI" --collection=goals --out=goals-backup.json
```

---

## 🐛 פתרון בעיות

### הסקריפט לא רץ
```bash
# ודא שהקובץ ניתן להרצה:
chmod +x full-reset.sh
chmod +x fresh-start.sh

# נסה שוב:
./full-reset.sh
```

### "Cannot find module"
```bash
# התקן dependencies:
npm install
```

### "Connection to MongoDB failed"
```bash
# בדוק את קובץ .env
cat .env

# ודא ש-MONGO_URI קיים ותקין
```

### הדאשבורד עדיין מראה נתונים ישנים
```bash
# נקה cache של הדפדפן:
# Chrome/Safari: Cmd+Shift+R (Mac) או Ctrl+Shift+R (Windows)

# או פתח בחלון incognito/private
```

---

## 📚 קבצים רלוונטיים

```
bought-finance-bot/
├── full-reset.sh          # איפוס מלא (DB + Session)
├── reset-database.js      # איפוס רק DB
├── fresh-start.sh         # איפוס רק Session
├── models/
│   ├── Transaction.js     # מודל טרנזקציות
│   ├── Budget.js          # מודל תקציבים
│   └── Goal.js            # מודל יעדים
└── .env                   # הגדרות חיבור לDB
```

---

## 🎓 שאלות נפוצות (FAQ)

### ש: האיפוס מוחק גם את הקוד?
**ת:** לא! הקוד נשאר. נמחקים רק הנתונים במסד הנתונים.

### ש: צריך לסרוק QR code מחדש?
**ת:** תלוי:
- `full-reset.sh` - כן
- `reset-database.js` - לא
- `fresh-start.sh` - כן

### ש: האיפוס משפיע על הדאשבורד?
**ת:** כן, הדאשבורד יראה נתונים ריקים כי הוא מושך מאותו DB.

### ש: אפשר לבטל איפוס?
**ת:** לא, אלא אם עשית גיבוי לפני.

### ש: כמה זמן לוקח האיפוס?
**ת:** בדרך כלל 5-10 שניות.

---

## 📞 צריך עזרה?

אם משהו לא עובד:
1. בדוק את הלוגים
2. וודא שה-DB connection תקין
3. נסה להפעיל מחדש את כל המערכת

---

**עדכון אחרון:** דצמבר 2025
**גרסה:** 1.0
