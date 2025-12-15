# WhatsApp Bought - מערכת ניהול פיננסי חכמה, לא סתם בוט

מערכת ניהול פיננסי מלאה המורכבת מבוט WhatsApp חכם עם AI ולוח בקרה מתקדם לניתוח נתונים.

## סקירה כללית

**Bought** היא מערכת ניהול פיננסי אישי המשלבת:

- בוט WhatsApp חכם עם בינה מלאכותית למעקב אחר הוצאות והכנסות
- לוח בקרה אינטראקטיבי לניתוח נתונים וויזואליזציה
- ניהול יעדי חיסכון ותקציבים
- סריקת קבלות אוטומטית עם Vision AI
- דוחות וסיכומים חודשיים אוטומטיים

## מבנה הפרויקט

```
WhatsApp Bought (bot)
├── bought-finance-bot/      # שרת Node.js + בוט WhatsApp
│   ├── models/              # מודלים של MongoDB
│   ├── routes/              # API endpoints
│   ├── services/            # לוגיקה עסקית
│   │   ├── ai/              # שירות AI
│   │   │   ├── AIService.js
│   │   │   └── prompts/     # פרומפטים מודולריים
│   │   └── whatsapp.js
│   ├── utils/               # פונקציות עזר
│   ├── .env.example         # דוגמה למשתני סביבה
│   ├── package.json         # תלויות
│   └── server.js            # נקודת כניסה ראשית
├── bought-dashboard/        # ממשק React
│   ├── public/              # קבצים סטטיים
│   ├── src/                 # קוד React
│   └── package.json         # תלויות
└── README.md               # המסמך הזה
```

---

## חלק 1: Bought Finance Bot

### תכונות עיקריות

#### ניהול פיננסי

- רישום אוטומטי של הוצאות והכנסות בעברית
- יעדי חיסכון חכמים עם מעקב אוטומטי
- סטטיסטיקות מפורטות (יומי, שבועי, חודשי)
- ניהול תקציב חודשי לפי קטגוריות
- התראות על חריגה מתקציב (מיידיות + יומיות)
- סיכום חודשי אוטומטי בשעה 20:00 בסוף כל חודש
- התראות יזומות יומיות בשעה 18:00

#### בינה מלאכותית מתקדמת

- **סיכומים חודשיים בשפה טבעית** - תובנות אישיות ומעניינות
- **זיהוי אנומליות אוטומטי** - זיהוי הוצאות חריגות
- **המלצות חיסכון מותאמות אישית** - עצות מעשיות
- **ייעוץ פיננסי חכם** - "האם אני יכול להרשות לעצמי...?"
- **סריקת קבלות בצילום** - העלה תמונת קבלה וקבל חילוץ אוטומטי

#### אבטחה

- אבטחה מלאה עם Helmet ו-Rate Limiting
- MongoDB Sanitization והגנה מפני NoSQL Injection

### התקנה והרצה

#### דרישות מקדימות

- Node.js (גרסה 16 ומעלה)
- MongoDB (מקומי או Atlas)
- חשבון OpenAI עם API Key

#### שלבי התקנה

1. **התקנת תלויות**

```bash
cd bought-finance-bot
npm install
```

2. **הגדרת משתני סביבה**

```bash
cp .env.example .env
```

ערוך את קובץ `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

3. **הרצת הבוט**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

4. **סריקת QR Code**

- פתח את WhatsApp במכשיר הנייד
- לחץ על התפריט (⋮) > WhatsApp Web
- סרוק את ה-QR Code שמופיע בטרמינל

### שימוש בבוט

#### רישום הוצאות

פשוט כתוב בשפה טבעית:

- "קניתי קפה ב-18 שקל"
- "תדלקתי 300 ש״ח"
- "קיבלתי משכורת 15000"

או שלח תמונה של קבלה - הבוט יחלץ אוטומטית את כל הפרטים!

#### פקודות עיקריות

**סטטיסטיקות:**

- `כמה הוצאתי` / `מצב` - סיכום חודשי עם AI
- `היום` - סיכום יומי
- `השבוע` - סיכום שבועי
- `קטגוריות` - פירוט לפי קטגוריות

**יעדי חיסכון:**

- `/יעד` - יצירת יעד חדש
- `היעדים` - הצגת כל היעדים
- `התקדמות` - מעקב אחר יעד פעיל

**ניהול:**

- `/תקציב` - הגדרת תקציב
- `/עזרה` - מדריך שימוש

#### קטגוריות זמינות

אוכל, תחבורה, קניות, חשבונות, בילויים, משכורת, בריאות, כללי

### API Endpoints

#### Transactions

```
GET    /api/transactions          - קבלת כל הטרנזקציות
GET    /api/transactions/:id      - קבלת טרנזקציה בודדת
POST   /api/transactions          - יצירת טרנזקציה חדשה
PUT    /api/transactions/:id      - עדכון טרנזקציה
DELETE /api/transactions/:id      - מחיקת טרנזקציה
```

#### Statistics

```
GET    /api/stats/daily           - סטטיסטיקות יומיות
GET    /api/stats/weekly          - סטטיסטיקות שבועיות
GET    /api/stats/monthly         - סטטיסטיקות חודשיות
GET    /api/stats/categories      - סטטיסטיקות לפי קטגוריות
```

#### Budget

```
GET    /api/budget                - קבלת תקציב
GET    /api/budget/compare        - השוואת תקציב להוצאות
```

#### Health

```
GET    /api/health                - בדיקת תקינות השרת
```

---

## חלק 2: Bought Dashboard

### תכונות לוח הבקרה

- **ויזואליזציה מתקדמת** - גרפים אינטראקטיביים (עוגה, עמודות, קווים)
- **ניתוח קטגוריות** - צפייה בפילוח הוצאות לפי קטגוריות
- **דוחות חודשיים** - מעקב אחר מגמות לאורך זמן
- **השוואת תקציב** - מעקב אחר ביצועים מול תקציב מתוכנן
- **ממשק רספונסיבי** - תומך במובייל ודסקטופ

### התקנה והרצה

1. **התקנת תלויות**

```bash
cd bought-dashboard
npm install
```

2. **הגדרת משתני סביבה**
   צור קובץ `.env` בתיקיית `bought-dashboard`:

```env
REACT_APP_API_URL=http://localhost:3001
```

3. **הרצת הדאשבורד**

```bash
# Development mode
npm start

# Production build
npm run build
```

הדאשבורד יהיה זמין ב: `http://localhost:3000`

### טכנולוגיות

- **Frontend**: React 19, TailwindCSS, Recharts
- **HTTP Client**: Axios
- **Routing**: React Router v7
- **Icons**: Lucide React

---

## הרצה מלאה של המערכת

להפעלה מלאה של המערכת יש להריץ **שני** שרתים במקביל:

### טרמינל 1 - Backend + WhatsApp Bot

```bash
cd bought-finance-bot
npm run dev
```

### טרמינל 2 - Frontend Dashboard

```bash
cd bought-dashboard
npm start
```

לאחר ההרצה:

1. סרוק את ה-QR Code ב-WhatsApp
2. פתח את הדאשבורד בדפדפן: `http://localhost:3000`
3. התחל לשלוח הוצאות בוואטסאפ או להוסיף ידנית בדאשבורד

---

## דגשים טכניים

### Backend

- **MongoDB Indexes** - אינדקסים אופטימליים לביצועים
- **Multi-user Support** - תמיכה במספר משתמשים במקביל
- **Error Handling** - טיפול מקיף בשגיאות
- **Graceful Shutdown** - כיבוי מסודר של שירותים
- **Scheduled Tasks** - משימות מתוזמנות עם node-cron
- **Vision AI** - GPT-4o Vision לסריקת קבלות

### Frontend

- **Component Architecture** - ארכיטקטורה מודולרית
- **Responsive Design** - תמיכה מלאה במובייל
- **Real-time Updates** - עדכון אוטומטי של נתונים
- **Error Boundaries** - טיפול בשגיאות ברמת הקומפוננטות

### Security

- **Helmet** - הגנה מפני פגיעויות HTTP
- **Rate Limiting** - 100 בקשות ל-15 דקות
- **MongoDB Sanitization** - הגנה מפני NoSQL Injection
- **CORS Protection** - הגבלת גישה לדומיינים מורשים
- **Input Validation** - בדיקת תקינות קלט

---

## Troubleshooting

### הבוט לא מתחבר ל-WhatsApp

- ודא ש-WhatsApp Web לא פעיל במכשיר אחר
- מחק את התיקייה `.wwebjs_auth/` ונסה שוב

### שגיאות OpenAI

- בדוק שהמפתח תקין
- ודא שיש קרדיט בחשבון OpenAI
- בדוק את ה-rate limits

### בעיות חיבור ל-MongoDB

- ודא שה-IP שלך מורשה ב-MongoDB Atlas
- בדוק את פרטי החיבור ב-.env

### הדאשבורד לא מתחבר לשרת

- ודא שהשרת רץ על פורט 3001
- בדוק את `REACT_APP_API_URL` ב-.env
- בדוק CORS settings בשרת

---

## אבטחת מפתחות

**חשוב מאוד:**

- אל תעלה קבצי `.env` ל-Git
- שמור על מפתח OpenAI בסוד
- החלף מיד מפתחות שנחשפו
- השתמש במשתני סביבה בסביבת ייצור

---

## רישיון

MIT License

---

## תמיכה

לשאלות ובעיות, פתח Issue ב-GitHub.

---

**Bought** - המערכת החכמה ביותר לניהול פיננסי אישי בעברית
