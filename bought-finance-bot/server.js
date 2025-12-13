require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cron = require('node-cron');
const WhatsAppBot = require('./services/whatsapp');
const WhatsAppBusinessAPI = require('./services/whatsapp-business');
const apiRoutes = require('./routes/api');

// יצירת אפליקציית Express
const app = express();

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'יותר מדי בקשות מה-IP הזה, נסה שוב מאוחר יותר',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// CORS Configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body Parser Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// בדיקת משתני סביבה
const { OPENAI_API_KEY, MONGO_URI, PORT = 3001, NODE_ENV = 'development' } = process.env;

if (!OPENAI_API_KEY || !MONGO_URI) {
    console.error('❌ ERROR: חסרים משתני סביבה חיוניים!');
    console.error('   יש להגדיר OPENAI_API_KEY ו־MONGO_URI בקובץ .env');
    process.exit(1);
}

// חיבור ל-MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ מחובר ל-MongoDB בהצלחה');
        console.log(`📊 Database: ${mongoose.connection.name}`);
    })
    .catch(err => {
        console.error('❌ שגיאה בחיבור ל-MongoDB:', err.message);
        process.exit(1);
    });

// טיפול באירועי MongoDB
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB התנתק');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ שגיאת MongoDB:', err);
});

// בחירה בין WhatsApp Web.js או Business API
const USE_BUSINESS_API = process.env.WHATSAPP_ACCESS_TOKEN ? true : false;

// אתחול WhatsApp Business API (אם קיים)
let whatsappBusiness;
if (USE_BUSINESS_API) {
    whatsappBusiness = new WhatsAppBusinessAPI({
        apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
        openaiApiKey: OPENAI_API_KEY
    });

    // Webhook routes
    const webhookRoutes = require('./routes/webhook')(whatsappBusiness);
    app.use('/webhook', webhookRoutes);

    console.log('📱 WhatsApp Business API mode enabled');
} else {
    console.log('📱 WhatsApp Web.js mode enabled');
}

// Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'Bought - WhatsApp Finance Bot API',
        version: '2.4.0',
        status: 'running',
        endpoints: {
            health: '/api/health',
            transactions: {
                list: '/api/transactions',
                single: '/api/transactions/:id',
                create: 'POST /api/transactions',
                update: 'PUT /api/transactions/:id',
                delete: 'DELETE /api/transactions/:id'
            },
            stats: {
                daily: '/api/stats/daily',
                weekly: '/api/stats/weekly',
                monthly: '/api/stats/monthly',
                categories: '/api/stats/categories'
            },
            budget: {
                get: '/api/budget',
                update: 'PUT /api/budget',
                compare: '/api/budget/compare'
            },
            goals: {
                list: '/api/goals',
                single: '/api/goals/:id',
                create: 'POST /api/goals',
                update: 'PUT /api/goals/:id',
                delete: 'DELETE /api/goals/:id',
                addProgress: 'POST /api/goals/:id/progress',
                summary: '/api/goals/:id/summary'
            }
        },
        features: {
            aiPowered: true,
            receiptScanning: true,
            monthlyReports: true,
            budgetAlerts: true,
            savingsGoals: true,
            financialAdvice: true
        },
        documentation: '/API_DOCS.md'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        success: false,
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// הפעלת השרת
const server = app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('🤖 Bought Finance Bot Started');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 API Server: http://localhost:${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`🤖 OpenAI: Connected`);
    console.log('═══════════════════════════════════════');
});

// יצירה והפעלת בוט WhatsApp (רק אם לא משתמשים ב-Business API)
let whatsappBot;

async function startWhatsAppBot() {
    try {
        console.log('\n🔄 מאתחל בוט WhatsApp Web.js...');
        whatsappBot = new WhatsAppBot(OPENAI_API_KEY);
        await whatsappBot.start();
    } catch (error) {
        console.error('❌ שגיאה באתחול בוט WhatsApp:', error);
        process.exit(1);
    }
}

// התחלת הבוט - רק אם לא משתמשים ב-Business API
if (!USE_BUSINESS_API) {
    startWhatsAppBot();
} else {
    console.log('✅ WhatsApp Business API initialized - waiting for webhooks');
}

// תזמון בדיקת תקציבים - כל יום בשעה 18:00
cron.schedule('0 18 * * *', async () => {
    console.log('🔍 מפעיל בדיקת תקציבים יומית...');
    if (whatsappBot && whatsappBot.isReady) {
        await whatsappBot.checkAllBudgetsAndAlert();
    } else {
        console.log('⚠️ הבוט לא מוכן, מדלג על בדיקת תקציבים');
    }
});

console.log('⏰ תזמון בדיקת תקציבים הופעל - ירוץ כל יום בשעה 18:00');

// תזמון סיכום חודשי - כל יום בשעה 20:00, אבל ישלח רק ביום האחרון של החודש
cron.schedule('0 20 * * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // בדיקה אם מחר הוא יום 1 של החודש (כלומר היום הוא האחרון של החודש)
    if (tomorrow.getDate() === 1) {
        console.log('🗓️ מפעיל משימת סיכום חודשי מתוזמנת...');
        if (whatsappBot && whatsappBot.isReady) {
            await whatsappBot.sendMonthlyReportToAllUsers();
        } else {
            console.log('⚠️ הבוט לא מוכן, מדלג על סיכום חודשי');
        }
    }
});

console.log('⏰ תזמון סיכום חודשי הופעל - ירוץ בסוף כל חודש בשעה 20:00');

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} - מתחיל כיבוי מסודר...`);
    
    // סגירת שרת Express
    server.close(() => {
        console.log('✅ שרת Express כובה');
    });

    // כיבוי בוט WhatsApp
    if (whatsappBot) {
        await whatsappBot.stop();
    }

    // סגירת חיבור MongoDB
    await mongoose.connection.close();
    console.log('✅ חיבור MongoDB נסגר');

    console.log('👋 כיבוי מסודר הושלם');
    process.exit(0);
};

// טיפול בסיגנלים
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// טיפול בשגיאות לא צפויות
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});