# 🔒 מדיניות אבטחה

## 🚨 דיווח על פגיעויות אבטחה

אם מצאת פגיעות אבטחה, אנא **אל תפרסם אותה בפומבי**.

שלח דוא"ל לכתובת: [your-email@example.com]

## ✅ שיטות עבודה מומלצות

### 1. משתני סביבה

- **אל תעלה לעולם** את קובץ `.env` ל-Git
- השתמש ב-`.env.example` כדוגמה בלבד
- בסביבת ייצור, השתמש במערכת ניהול סודות (כמו AWS Secrets Manager, HashiCorp Vault)

### 2. מפתחות API

#### OpenAI API Key
```bash
# ✅ טוב - במשתני סביבה
OPENAI_API_KEY=sk-...

# ❌ רע - בקוד
const apiKey = "sk-..."
```

**אם המפתח נחשף:**
1. עבור מיד ל-[OpenAI Dashboard](https://platform.openai.com/api-keys)
2. שלול (Revoke) את המפתח המושפע
3. צור מפתח חדש
4. עדכן את `.env`

#### MongoDB Connection String
- השתמש במשתמש ייעודי עם הרשאות מינימליות
- הגבל גישה לפי IP ב-MongoDB Atlas
- החלף סיסמאות באופן קבוע

### 3. Rate Limiting

הגדרות ברירת מחדל:
```javascript
windowMs: 15 * 60 * 1000,  // 15 דקות
max: 100                    // 100 בקשות
```

**להתאמה אישית:**
```javascript
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,  // 10 דקות
    max: 50,                    // 50 בקשות
    message: 'Too many requests'
});
```

### 4. CORS

**Development:**
```env
ALLOWED_ORIGINS=*
```

**Production:**
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 5. HTTPS

בסביבת ייצור, **תמיד** השתמש ב-HTTPS:

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
        res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
        next();
    }
});
```

### 6. ניטור ולוגים

**אל תשמור בלוגים:**
- סיסמאות
- מפתחות API
- מספרי כרטיס אשראי
- מידע אישי מזהה

**כן שמור:**
- IP addresses (anonymized)
- User IDs (hashed)
- Error types
- Performance metrics

### 7. עדכוני תלויות

בדוק באופן קבוע עדכוני אבטחה:

```bash
# בדוק פגיעויות
npm audit

# תקן פגיעויות
npm audit fix

# תקן גם breaking changes
npm audit fix --force
```

### 8. MongoDB Security

**בדוק ש-:**
- לא משתמשים ב-`mongodb://` (ללא SSL)
- יש הגבלת IP Whitelist
- יש authentication מופעל
- אין גישת admin למסד הנתונים

### 9. Input Validation

כל קלט מהמשתמש **חייב** לעבור validation:

```javascript
// ✅ טוב
const amount = parseInt(req.body.amount);
if (isNaN(amount) || amount < 0) {
    return res.status(400).json({ error: 'Invalid amount' });
}

// ❌ רע
const amount = req.body.amount;
await Transaction.create({ amount }); // injection!
```

### 10. Error Messages

**Production:**
```javascript
// ✅ טוב - הודעה כללית
res.status(500).json({ error: 'Internal server error' });

// ❌ רע - חושף מידע
res.status(500).json({ error: error.stack });
```

## 🛡️ תצורת אבטחה מומלצת

### Environment Variables (Production)

```env
NODE_ENV=production
OPENAI_API_KEY=sk-...
MONGO_URI=mongodb+srv://...
PORT=443
ALLOWED_ORIGINS=https://yourdomain.com

# Additional security
SESSION_SECRET=random-strong-secret
JWT_SECRET=another-random-secret
BCRYPT_ROUNDS=12
```

### Nginx Configuration (Reverse Proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📋 Security Checklist

לפני העלאה לייצור:

- [ ] כל המפתחות במשתני סביבה
- [ ] `.env` ב-`.gitignore`
- [ ] HTTPS מופעל
- [ ] CORS מוגבל לדומיינים ספציפיים
- [ ] Rate limiting פעיל
- [ ] Helmet middleware מופעל
- [ ] MongoDB עם authentication ו-IP whitelist
- [ ] Error messages לא חושפים מידע רגיש
- [ ] Logs לא כוללים מידע רגיש
- [ ] `npm audit` לא מציג פגיעויות חמורות
- [ ] Input validation על כל endpoint
- [ ] Body size limits מוגדרים

## 🔄 עדכונים אבטחה

הפרויקט משתמש בחבילות הבאות לאבטחה:

- **helmet**: הגנה מפני פגיעויות HTTP
- **express-rate-limit**: הגבלת בקשות
- **express-mongo-sanitize**: הגנה מפני NoSQL injection

ודא שהן תמיד בגרסאות האחרונות:

```bash
npm update helmet express-rate-limit express-mongo-sanitize
```

## 📞 יצירת קשר

לדיווח על בעיות אבטחה: [your-email@example.com]
