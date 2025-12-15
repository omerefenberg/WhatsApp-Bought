require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cron = require('node-cron');
const WhatsAppBot = require('./services/whatsapp');
const apiRoutes = require('./routes/api');

// Create Express application
const app = express();

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later',
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

// Check environment variables
const { OPENAI_API_KEY, MONGO_URI, PORT = 3001, NODE_ENV = 'development' } = process.env;

if (!OPENAI_API_KEY || !MONGO_URI) {
    console.error('❌ ERROR: Missing required environment variables!');
    console.error('   Please set OPENAI_API_KEY and MONGO_URI in .env file');
    process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// Handle MongoDB events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});


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

// Start server
const server = app.listen(PORT, () => {
    console.log('🤖 Bought Finance Bot Started');
    console.log(`🌐 API Server: http://localhost:${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`🤖 OpenAI: Connected`);
});

// Initialize WhatsApp bot
let whatsappBot;

async function startWhatsAppBot() {
    try {
        console.log('\n🔄 Initializing WhatsApp Web.js bot...');
        whatsappBot = new WhatsAppBot(OPENAI_API_KEY);
        await whatsappBot.start();
    } catch (error) {
        console.error('❌ WhatsApp bot initialization error:', error);
        process.exit(1);
    }
}

startWhatsAppBot();

// Budget check scheduler - runs daily at 18:00
cron.schedule('0 18 * * *', async () => {
    console.log('🔍 Running daily budget check...');
    if (whatsappBot && whatsappBot.isReady) {
        await whatsappBot.checkAllBudgetsAndAlert();
    } else {
        console.log('⚠️ Bot not ready, skipping budget check');
    }
});

console.log('⏰ Budget check scheduler enabled - runs daily at 18:00');

// Monthly summary scheduler - runs daily at 20:00, sends only on last day of month
cron.schedule('0 20 * * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if tomorrow is the 1st (meaning today is the last day of the month)
    if (tomorrow.getDate() === 1) {
        console.log('🗓️ Running scheduled monthly summary...');
        if (whatsappBot && whatsappBot.isReady) {
            await whatsappBot.sendMonthlyReportToAllUsers();
        } else {
            console.log('⚠️ Bot not ready, skipping monthly summary');
        }
    }
});

console.log('⏰ Monthly summary scheduler enabled - runs at end of each month at 20:00');

// Graceful Shutdown
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} - Starting graceful shutdown...`);

    // Close Express server
    server.close(() => {
        console.log('✅ Express server closed');
    });

    // Stop WhatsApp bot
    if (whatsappBot) {
        await whatsappBot.stop();
    }

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');

    console.log('👋 Graceful shutdown completed');
    process.exit(0);
};

// Handle signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unexpected errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});