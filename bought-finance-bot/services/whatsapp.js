const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const AIService = require('./ai');
const {
    getMonthlyStats,
    getDailyStats,
    getWeeklyStats,
    getCategoryStats,
    formatStatsMessage,
    getMonthlyBudgetComparison
} = require('../utils/stats');

class WhatsAppBot {
    constructor(openaiApiKey) {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.aiService = new AIService(openaiApiKey);
        this.isReady = false;

        // מעקב אחר משתמשים שממתינים לכתוב יעד
        this.awaitingGoalInput = new Set();

        this.setupHandlers();
    }

    /**
     * הגדרת ה-Handlers
     */
    setupHandlers() {
        this.client.on('qr', (qr) => {
            console.log('📱 סרוק את ה-QR Code:');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            console.log('🤖 Bought מוכן ומזומן!');
            this.isReady = true;
        });

        this.client.on('authenticated', () => {
            console.log('✅ אומתה בהצלחה');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ כשל באימות:', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('❌ התנתק:', reason);
            this.isReady = false;
        });

        this.client.on('message_create', async (message) => {
            await this.handleMessage(message);
        });
    }

    /**
     * טיפול בהודעה
     */
    async handleMessage(message) {
        try {
            // התעלם מהודעות של הבוט עצמו
            if (message.fromMe) {
                return;
            }

            // התעלם מקבוצות
            if (message.from.includes('@g.us')) {
                return;
            }

            // בדיקה אם יש מספר טלפון מוגדר - אם כן, אפשר רק למספר הזה
            const myPhoneNumber = process.env.MY_PHONE_NUMBER;

            // אם אין מספר מוגדר, הדפס את המספרים שנכנסים (לעזרה בהגדרה)
            if (!myPhoneNumber) {
                console.log(`📞 הודעה מ: ${message.from}`);
                console.log(`💡 הוסף את השורה הזו ל-.env כדי להגביל רק למספר הזה:`);
                console.log(`   MY_PHONE_NUMBER=${message.from}`);
            }

            if (myPhoneNumber && message.from !== myPhoneNumber) {
                console.log(`🚫 התעלמתי מהודעה מ-${message.from} (רק ${myPhoneNumber} מורשה)`);
                return;
            }

            const userId = message.from;

            // טיפול בהודעות תמונה (קבלות)
            if (message.hasMedia) {
                console.log(`📎 הודעה עם מדיה - סוג: ${message.type}`);

                // בדיקה אם זו תמונה
                if (message.type === 'image') {
                    await this.handleReceiptImage(message);
                    return;
                }

                // התעלם מסוגי מדיה אחרים (video, audio, document, ptt)
                console.log(`ℹ️ מתעלם ממדיה מסוג: ${message.type}`);
                return;
            }

            // התעלם מהודעות ריקות או קצרות מדי
            if (!message.body || message.body.length < 2) {
                return;
            }

            const text = message.body.trim().toLowerCase();

            // בדיקה אם המשתמש ממתין להזין יעד
            if (this.awaitingGoalInput.has(userId)) {
                await this.processGoalInput(message);
                return;
            }

            // בדיקה אם המשתמש צריך להגדיר תקציב
            const userBudget = await Budget.findOne({ userId });

            if (!userBudget || !userBudget.setupCompleted) {
                await this.handleBudgetSetup(message, userId, userBudget);
                return;
            }

            // פקודת עזרה
            if (text === '/עזרה' || text === 'עזרה' || text === '?' || text === '/help') {
                await this.sendHelpMessage(message);
                return;
            }

            // פקודת הגדרת תקציב מחדש
            if (text === '/תקציב' || text === 'תקציב חדש' || text === 'הגדר תקציב') {
                await this.resetBudgetSetup(userId);
                await message.reply('🔄 אוקיי, בוא נגדיר את התקציב מחדש!\n\nכמה אתה רוצה להוציא על *אוכל* בחודש? (בשקלים)');
                return;
            }

            // סטטיסטיקות יומיות
            if (text.includes('היום') || text.includes('כמה הוצאתי היום')) {
                await this.sendDailyStats(message);
                return;
            }

            // סטטיסטיקות שבועיות
            if (text.includes('השבוע') || text.includes('שבועי')) {
                await this.sendWeeklyStats(message);
                return;
            }

            // סטטיסטיקות חודשיות
            if (text.includes('החודש') || text.includes('כמה הוצאתי') || 
                text.includes('מצב') || text.includes('סיכום')) {
                await this.sendMonthlyStats(message);
                return;
            }

            // סטטיסטיקות קטגוריות
            if (text.includes('קטגוריות') || text.includes('פירוט') ||
                text.includes('הוצאות חודשיות') || text.includes('פירוט הוצאות') ||
                text.includes('סיכום הוצאות')) {
                await this.sendCategoryStats(message);
                return;
            }

            // ניהול יעדי חיסכון
            if (text.includes('/יעד') || text.includes('יעד חדש') || text.includes('יעד חיסכון')) {
                await this.handleGoalCreation(message);
                return;
            }

            if (text.includes('היעדים') || text.includes('רשימת יעדים') || text.includes('יעדים שלי')) {
                await this.showGoals(message);
                return;
            }

            if (text.includes('התקדמות') || text.includes('סטטוס יעד')) {
                await this.showGoalProgress(message);
                return;
            }

            // שאלות יעוץ פיננסי
            if (text.includes('האם אני יכול') || text.includes('האם אפשר') ||
                text.includes('להרשות לעצמי') || text.includes('כדאי לקנות')) {
                await this.handleFinancialAdvice(message);
                return;
            }

            // ניתוח הודעה רגילה עם AI
            await this.processFinancialMessage(message);

        } catch (error) {
            console.error('❌ שגיאה בטיפול בהודעה:', error);
            await message.reply('⚠️ מצטער, היתה בעיה בעיבוד ההודעה. נסה שוב.');
        }
    }

    /**
     * טיפול בהגדרת תקציב
     */
    async handleBudgetSetup(message, userId, userBudget) {
        const categories = ['אוכל', 'תחבורה', 'קניות', 'חשבונות', 'בילויים', 'בריאות', 'כללי'];
        const categoryEmojis = {
            'אוכל': '🍔',
            'תחבורה': '🚗',
            'קניות': '🛒',
            'חשבונות': '💡',
            'בילויים': '🎉',
            'בריאות': '🏥',
            'כללי': '📦'
        };

        // אם אין משתמש, צור חדש
        if (!userBudget) {
            userBudget = await Budget.create({
                userId,
                phoneNumber: message.from,
                setupStep: 0
            });
            
            await message.reply(
                '👋 *ברוך הבא ל-Bought!*\n\n' +
                'הבוט החכם לניהול פיננסי 💰\n\n' +
                'לפני שנתחיל, בוא נגדיר את התקציב החודשי שלך.\n\n' +
                'כמה אתה רוצה להוציא על *🍔 אוכל* בחודש?\n' +
                '_(כתוב רק את הסכום במספרים, לדוגמה: 2000)_'
            );
            return;
        }

        const currentStep = userBudget.setupStep;
        const text = message.body.trim();
        const amount = parseInt(text.replace(/[^\d]/g, ''));

        // אם הסכום לא תקין
        if (isNaN(amount) || amount < 0) {
            await message.reply('❌ אנא כתוב סכום תקין במספרים בלבד (לדוגמה: 1500)');
            return;
        }

        // שמור את הסכום לקטגוריה הנוכחית
        const currentCategory = categories[currentStep];
        userBudget.categories[currentCategory] = amount;
        
        // עבור לשלב הבא
        userBudget.setupStep = currentStep + 1;

        // אם סיימנו את כל הקטגוריות
        if (userBudget.setupStep >= categories.length) {
            userBudget.setupCompleted = true;
            await userBudget.save();

            // שלח סיכום
            let summary = '🎉 *מעולה! התקציב שלך הוגדר בהצלחה!*\n\n';
            summary += '📊 *התקציב החודשי שלך:*\n\n';
            
            let totalBudget = 0;
            categories.forEach(cat => {
                const budget = userBudget.categories[cat];
                totalBudget += budget;
                summary += `${categoryEmojis[cat]}  ${cat}: ${budget.toLocaleString()} ₪\n`;
            });
            
            summary += `\n━━━━━━━━━━━━━━━━━\n`;
            summary += `💰 *סה״כ תקציב: ${totalBudget.toLocaleString()} ₪*\n\n`;
            summary += `✨ עכשיו אתה יכול להתחיל לרשום הוצאות!\n`;
            summary += `פשוט כתוב משהו כמו: "קניתי קפה ב-18 שקל"\n\n`;
            summary += `💡 כתוב */עזרה* לראות את כל הפקודות`;

            await message.reply(summary);
            return;
        }

        // המשך לקטגוריה הבאה
        await userBudget.save();
        const nextCategory = categories[userBudget.setupStep];
        const emoji = categoryEmojis[nextCategory];
        
        await message.reply(
            `✅ נשמר!\n\n` +
            `כמה אתה רוצה להוציא על *${emoji} ${nextCategory}* בחודש?\n` +
            `_(${userBudget.setupStep + 1}/${categories.length})_`
        );
    }

    /**
     * איפוס הגדרות תקציב
     */
    async resetBudgetSetup(userId) {
        await Budget.findOneAndUpdate(
            { userId },
            { 
                setupCompleted: false, 
                setupStep: 0,
                categories: {
                    אוכל: 0,
                    תחבורה: 0,
                    קניות: 0,
                    חשבונות: 0,
                    בילויים: 0,
                    בריאות: 0,
                    כללי: 0
                }
            },
            { upsert: true }
        );
    }

    /**
     * טיפול בתמונת קבלה
     */
    async handleReceiptImage(message) {
        try {
            console.log('📸 התקבלה תמונת קבלה מ:', message.from);

            // שליחת הודעת המתנה
            await message.reply('📸 מעבד את הקבלה... רגע אחד ⏳');

            // הורדת התמונה
            console.log('⬇️ מוריד את התמונה...');
            const media = await message.downloadMedia();

            if (!media) {
                console.error('❌ לא הצלחתי להוריד את המדיה');
                await message.reply('⚠️ שגיאה בהורדת התמונה, נסה שוב');
                return;
            }

            console.log(`✅ תמונה הורדה - גודל: ${media.data.length} bytes, mimetype: ${media.mimetype}`);

            // וידוא שזו תמונה
            if (!media.mimetype || !media.mimetype.startsWith('image/')) {
                console.error('❌ הקובץ אינו תמונה:', media.mimetype);
                await message.reply('⚠️ אנא שלח קובץ תמונה (JPG, PNG)');
                return;
            }

            // המרה ל-base64 (media.data כבר base64)
            const imageBase64 = media.data;

            // ניתוח הקבלה עם AI
            console.log('🤖 שולח ל-AI לניתוח...');
            const transaction = await this.aiService.parseReceipt(imageBase64);

            if (!transaction) {
                console.log('⚠️ AI לא זיהה מידע פיננסי בתמונה');
                await message.reply('⚠️ לא הצלחתי לזהות מידע פיננסי בקבלה.\n\n💡 טיפ: ודא שהקבלה ברורה ושהסכום הכולל נראה בבירור.\n\n📝 אפשר גם לכתוב ידנית: "קניתי X ב-Y שקל"');
                return;
            }

            console.log(`✅ AI זיהה: ${transaction.description} - ${transaction.amount}₪`);

            // שמירה במסד נתונים
            const saved = await Transaction.create({
                ...transaction,
                userId: message.from,
                source: 'whatsapp-receipt'
            });

            console.log(`💾 נשמר מקבלה: ${saved.description} - ${saved.amount}₪`);

            // תגובה מפורטת למשתמש
            const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
            let reply = `✅ קלטתי את הקבלה!\n\n` +
                `${typeEmoji} ${transaction.description}\n` +
                `📁 ${transaction.category}\n` +
                `💵 ${transaction.amount.toLocaleString()}₪`;

            // הוספת מידע נוסף אם יש
            if (transaction.merchant) {
                reply += `\n🏪 ${transaction.merchant}`;
            }

            if (transaction.items && transaction.items.length > 0) {
                reply += `\n\n📝 פריטים:\n${transaction.items.slice(0, 3).map(item => `  • ${item}`).join('\n')}`;
                if (transaction.items.length > 3) {
                    reply += `\n  ... ועוד ${transaction.items.length - 3}`;
                }
            }

            await message.reply(reply);

            // בדיקת חריגה מתקציב (רק להוצאות)
            if (transaction.type === 'expense') {
                await this.checkBudgetAlert(message, transaction.category);
            }

        } catch (error) {
            console.error('❌ שגיאה בעיבוד קבלה:', error);
            console.error('פרטי שגיאה:', {
                message: error.message,
                code: error.code,
                status: error.status
            });

            // הודעות שגיאה ספציפיות
            let errorMsg = '⚠️ מצטער, היתה בעיה בעיבוד הקבלה.\n\n';

            if (error.message && error.message.includes('מכסה')) {
                errorMsg += '💰 אין מספיק קרדיט ב-OpenAI API.\n';
                errorMsg += '📞 צור קשר עם מנהל המערכת.';
            } else if (error.code === 'insufficient_quota') {
                errorMsg += '💰 אין מספיק קרדיט ב-OpenAI API.\n';
                errorMsg += '📞 צור קשר עם מנהל המערכת.';
            } else if (error.status === 429) {
                errorMsg += '⏱️ יותר מדי בקשות.\n';
                errorMsg += 'נסה שוב בעוד כמה שניות.';
            } else {
                errorMsg += '📝 אפשר לכתוב את ההוצאה ידנית:\n';
                errorMsg += '"קניתי [מוצר] ב-[סכום] שקל"';
            }

            await message.reply(errorMsg);
        }
    }

    /**
     * עיבוד הודעה פיננסית
     */
    async processFinancialMessage(message) {
        try {
            const transaction = await this.aiService.parseTransaction(message.body);

            if (!transaction) {
                return;
            }

            // שמירה במסד נתונים
            const saved = await Transaction.create({
                ...transaction,
                userId: message.from,
                source: 'whatsapp'
            });

            console.log(`💾 נשמר: ${saved.description} - ${saved.amount}₪`);

            // תגובה למשתמש
            const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
            let reply = `✅ רשמתי:\n` +
                `${typeEmoji} ${transaction.description}\n` +
                `📁 ${transaction.category}\n` +
                `💵 ${transaction.amount.toLocaleString()}₪`;

            await message.reply(reply);

            // בדיקת חריגה מתקציב (רק להוצאות)
            if (transaction.type === 'expense') {
                await this.checkBudgetAlert(message, transaction.category);
            }

        } catch (error) {
            console.error('❌ שגיאה בעיבוד:', error);
            throw error;
        }
    }

    /**
     * בדיקה והתראה על חריגה מתקציב
     */
    async checkBudgetAlert(message, category) {
        try {
            const userId = message.from;
            const userBudget = await Budget.findOne({ userId, setupCompleted: true });

            if (!userBudget) return;

            const categoryBudget = userBudget.categories[category];
            if (!categoryBudget || categoryBudget === 0) return;

            // חישוב הוצאות לקטגוריה זו החודש
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const transactions = await Transaction.find({
                userId: userId,
                type: 'expense',
                category: category,
                date: { $gte: startOfMonth }
            });

            const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
            const percentage = Math.round((totalSpent / categoryBudget) * 100);
            const remaining = categoryBudget - totalSpent;

            // התראות לפי אחוזים
            if (percentage >= 100) {
                await message.reply(
                    `🚨 *התראת תקציב!*\n\n` +
                    `חרגת מהתקציב של *${category}*!\n` +
                    `💰 תקציב: ${categoryBudget.toLocaleString()} ₪\n` +
                    `💸 הוצאת: ${totalSpent.toLocaleString()} ₪\n` +
                    `📊 חריגה: ${Math.abs(remaining).toLocaleString()} ₪ (${percentage}%)`
                );
            } else if (percentage >= 90) {
                await message.reply(
                    `⚠️ *התראת תקציב!*\n\n` +
                    `נותרו רק ${remaining.toLocaleString()} ₪ בתקציב ${category}\n` +
                    `📊 ניצלת ${percentage}% מהתקציב`
                );
            } else if (percentage >= 75) {
                await message.reply(
                    `💡 *עדכון תקציב*\n\n` +
                    `ניצלת ${percentage}% מתקציב ${category}\n` +
                    `נותרו: ${remaining.toLocaleString()} ₪`
                );
            }

        } catch (error) {
            console.error('❌ שגיאה בבדיקת תקציב:', error);
        }
    }

    /**
     * שליחת סטטיסטיקות יומיות
     */
    async sendDailyStats(message) {
        try {
            const userId = message.from;
            const stats = await getDailyStats(userId);
            const formatted = formatStatsMessage(stats, 'היום');
            await message.reply(formatted);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות יומיות:', error);
            await message.reply('⚠️ שגיאה בשליפת נתונים יומיים');
        }
    }

    /**
     * שליחת סטטיסטיקות שבועיות
     */
    async sendWeeklyStats(message) {
        try {
            const userId = message.from;
            const stats = await getWeeklyStats(userId);
            const formatted = formatStatsMessage(stats, 'השבוע');
            await message.reply(formatted);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות שבועיות:', error);
            await message.reply('⚠️ שגיאה בשליפת נתונים שבועיים');
        }
    }

    /**
     * שליחת סטטיסטיקות חודשיות
     */
    async sendMonthlyStats(message) {
        try {
            const userId = message.from;
            const stats = await getMonthlyStats(userId);
            const formatted = formatStatsMessage(stats, 'החודש');
            await message.reply(formatted);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות חודשיות:', error);
            await message.reply('⚠️ שגיאה בשליפת נתונים חודשיים');
        }
    }

    /**
     * שליחת סטטיסטיקות לפי קטגוריות (סגנון RiseUp)
     */
    async sendCategoryStats(message) {
        try {
            const userId = message.from;
            const stats = await getCategoryStats(userId);
            
            if (stats.length === 0) {
                await message.reply('📊 אין עדיין הוצאות החודש');
                return;
            }

            // מיפוי אייקונים לקטגוריות
            const categoryEmojis = {
                'אוכל': '🍔',
                'תחבורה': '🚗',
                'קניות': '🛒',
                'חשבונות': '💡',
                'בילויים': '🎉',
                'משכורת': '💰',
                'בריאות': '🏥',
                'כללי': '📦'
            };

            // חישוב סכום כולל
            const totalExpense = stats.reduce((sum, cat) => sum + cat.value, 0);

            // בניית הודעה מעוצבת
            let msg = '*ההוצאות החודשיות שלי*\n\n';
            
            stats.forEach(cat => {
                const emoji = categoryEmojis[cat.name] || '📌';
                const amount = cat.value.toLocaleString();
                msg += `${emoji}  ${cat.name.padEnd(12, ' ')}${amount} ש״ח\n`;
            });

            msg += `\n━━━━━━━━━━━━━━━━━\n`;
            msg += `*סה״כ  ${totalExpense.toLocaleString()} ש״ח*`;

            await message.reply(msg);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות קטגוריות:', error);
            await message.reply('⚠️ שגיאה בשליפת נתוני קטגוריות');
        }
    }

    /**
     * שליחת הודעת עזרה
     */
    async sendHelpMessage(message) {
        const helpText = `🤖 *Bought - מדריך שימוש*

📝 *רישום הוצאות:*
• כתוב בשפה טבעית: "קניתי קפה ב-18 שקל"
• 📸 *צלם קבלה* - הבוט יחלץ את הפרטים אוטומטית!
  (תומך ב-GPT-4o Vision - זיהוי חכם של קבלות)

📊 *סטטיסטיקות:*
• "כמה הוצאתי" / "מצב" - סיכום חודשי עם תובנות AI
• "היום" - סיכום יומי
• "השבוע" - סיכום שבועי
• "סיכום הוצאות" - פירוט לפי קטגוריות

🎯 *יעדי חיסכון:*
• "/יעד" - הגדרת יעד חיסכון חדש
• "היעדים" - צפייה בכל היעדים
• "התקדמות" - מעקב אחר יעד פעיל

💡 *ייעוץ פיננסי חכם:*
• "האם אני יכול להרשות לעצמי...?"
• "כדאי לקנות...?"
AI יבדוק את המצב שלך ויתן המלצה אישית

💰 *ניהול תקציב:*
• "/תקציב" - הגדרת תקציב מחדש
• התראות אוטומטיות על חריגות

🤖 *תכונות AI חכמות:*
✓ סיכומים חודשיים בשפה טבעית
✓ זיהוי הוצאות חריגות
✓ המלצות חיסכון מותאמות אישית
✓ ניתוח קבלות עם Vision AI

_הקלד /עזרה בכל עת לראות הודעה זו_`;

        await message.reply(helpText);
    }

    /**
     * התחלת הבוט
     */
    async start() {
        try {
            console.log('🔄 מאתחל את הבוט...');
            await this.client.initialize();
        } catch (error) {
            console.error('❌ שגיאה באתחול:', error);
            throw error;
        }
    }

    /**
     * בדיקה יזומה של כל התקציבים ושליחת התראות למשתמשים
     */
    async checkAllBudgetsAndAlert() {
        try {
            console.log('🔍 בודק תקציבים של כל המשתמשים...');

            const budgets = await Budget.find({ setupCompleted: true });

            for (const budget of budgets) {
                try {
                    const userId = budget.userId;
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);

                    const categories = ['אוכל', 'תחבורה', 'קניות', 'חשבונות', 'בילויים', 'בריאות', 'כללי'];
                    const alerts = [];

                    // בדיקת כל קטגוריה
                    for (const category of categories) {
                        const categoryBudget = budget.categories[category];
                        if (!categoryBudget || categoryBudget === 0) continue;

                        // חישוב הוצאות לקטגוריה זו החודש
                        const transactions = await Transaction.find({
                            userId,
                            type: 'expense',
                            category,
                            date: { $gte: startOfMonth }
                        });

                        const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
                        const percentage = Math.round((totalSpent / categoryBudget) * 100);
                        const remaining = categoryBudget - totalSpent;

                        // איסוף התראות
                        if (percentage >= 100) {
                            alerts.push({
                                type: 'over',
                                category,
                                percentage,
                                remaining: Math.abs(remaining),
                                budget: categoryBudget,
                                spent: totalSpent
                            });
                        } else if (percentage >= 85 && percentage < 100) {
                            alerts.push({
                                type: 'warning',
                                category,
                                percentage,
                                remaining,
                                budget: categoryBudget,
                                spent: totalSpent
                            });
                        }
                    }

                    // שליחת התראה אם יש
                    if (alerts.length > 0) {
                        let message = '⚠️ *התראת תקציב יומית*\n\n';

                        const overBudget = alerts.filter(a => a.type === 'over');
                        const warnings = alerts.filter(a => a.type === 'warning');

                        if (overBudget.length > 0) {
                            message += '🚨 *קטגוריות שחרגת:*\n';
                            overBudget.forEach(alert => {
                                message += `   • ${alert.category}: חריגה של ${alert.remaining.toLocaleString()} ₪ (${alert.percentage}%)\n`;
                            });
                            message += '\n';
                        }

                        if (warnings.length > 0) {
                            message += '⚠️ *קטגוריות קרובות לגבול (85%+):*\n';
                            warnings.forEach(alert => {
                                message += `   • ${alert.category}: ${alert.percentage}% - נותרו ${alert.remaining.toLocaleString()} ₪\n`;
                            });
                            message += '\n';
                        }

                        message += '💡 *טיפ:* התחל לצמצם הוצאות בקטגוריות אלה כדי להישאר בתקציב.';

                        await this.client.sendMessage(userId, message);
                        console.log(`✅ התראת תקציב נשלחה ל-${userId}`);

                        // המתנה קצרה בין הודעות
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                } catch (error) {
                    console.error(`❌ שגיאה בבדיקת תקציב ל-${budget.userId}:`, error.message);
                }
            }

            console.log('✅ בדיקת תקציבים הושלמה');
        } catch (error) {
            console.error('❌ שגיאה בבדיקת תקציבים:', error);
        }
    }

    /**
     * שליחת סיכום חודשי לכל המשתמשים - עם תובנות AI
     */
    async sendMonthlyReportToAllUsers() {
        try {
            console.log('📅 שולח סיכום חודשי לכל המשתמשים...');

            // קבלת כל המשתמשים עם תקציב מוגדר
            const budgets = await Budget.find({ setupCompleted: true });

            for (const budget of budgets) {
                try {
                    const comparison = await getMonthlyBudgetComparison(budget.userId);

                    if (!comparison) {
                        continue;
                    }

                    // קבלת נתונים מהחודש הקודם להשוואה
                    const previousMonthData = await this.getPreviousMonthData(budget.userId);

                    // יצירת סיכום בשפה טבעית עם AI
                    const aiSummary = await this.aiService.generateMonthlySummaryWithInsights(
                        budget.userId,
                        comparison,
                        previousMonthData
                    );

                    // בניית ההודעה
                    let message = '🎊 *סיכום חודשי - ' + new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) + '*\n\n';

                    // תובנות AI
                    if (aiSummary) {
                        message += `${aiSummary}\n\n`;
                        message += '━━━━━━━━━━━━━━━━\n\n';
                    }

                    // נתונים מספריים
                    message += `📊 *נתונים:*\n`;
                    message += `💰 תקציב: ${comparison.totalBudget.toLocaleString()} ₪\n`;
                    message += `💸 הוצאת: ${comparison.totalSpent.toLocaleString()} ₪\n`;
                    message += `📈 ניצול: ${comparison.overallPercentage}%\n`;

                    if (comparison.savedMoney) {
                        message += `✨ חסכת: ${comparison.totalSaved.toLocaleString()} ₪\n`;
                    } else {
                        message += `⚠️ חריגה: ${Math.abs(comparison.totalSaved).toLocaleString()} ₪\n`;
                    }

                    // זיהוי אנומליות - הוצאות חריגות
                    const currentMonth = await this.getCurrentMonthExpenses(budget.userId);
                    const historicalExpenses = await this.getHistoricalExpenses(budget.userId, 3);

                    if (historicalExpenses.length >= 20) { // רק אם יש מספיק היסטוריה
                        const anomalies = await this.aiService.detectAnomalies(
                            budget.userId,
                            currentMonth,
                            historicalExpenses
                        );

                        if (anomalies && anomalies.message) {
                            message += `\n🔍 *שימו לב:*\n${anomalies.message}`;
                        }
                    }

                    // המלצות חיסכון אישיות
                    const monthlyExpenses = await Transaction.find({
                        userId: budget.userId,
                        type: 'expense',
                        date: {
                            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                        }
                    });

                    const savingsSuggestion = await this.aiService.generateSavingsSuggestions(
                        budget.userId,
                        monthlyExpenses,
                        comparison
                    );

                    if (savingsSuggestion) {
                        message += `\n\n💡 *המלצה לחיסכון:*\n${savingsSuggestion}`;
                    }

                    // שליחת ההודעה
                    await this.client.sendMessage(budget.userId, message);
                    console.log(`✅ סיכום חודשי נשלח ל-${budget.userId}`);

                    // המתנה קצרה בין הודעות כדי לא להיחסם
                    await new Promise(resolve => setTimeout(resolve, 3000));

                } catch (error) {
                    console.error(`❌ שגיאה בשליחת סיכום ל-${budget.userId}:`, error.message);
                }
            }

            console.log('✅ סיכום חודשי נשלח לכל המשתמשים');
        } catch (error) {
            console.error('❌ שגיאה בשליחת סיכומים חודשיים:', error);
        }
    }

    /**
     * קבלת נתוני חודש קודם להשוואה
     */
    async getPreviousMonthData(userId) {
        try {
            const previousMonth = new Date();
            previousMonth.setMonth(previousMonth.getMonth() - 1);
            const startOfPreviousMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
            const endOfPreviousMonth = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

            const expenses = await Transaction.find({
                userId,
                type: 'expense',
                date: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth }
            });

            const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

            return { totalSpent };
        } catch (error) {
            console.error('❌ שגיאה בקבלת נתוני חודש קודם:', error.message);
            return null;
        }
    }

    /**
     * קבלת הוצאות החודש הנוכחי לפי קטגוריה
     */
    async getCurrentMonthExpenses(userId) {
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const expenses = await Transaction.find({
                userId,
                type: 'expense',
                date: { $gte: startOfMonth }
            });

            const categoryTotals = {};
            expenses.forEach(exp => {
                if (!categoryTotals[exp.category]) {
                    categoryTotals[exp.category] = 0;
                }
                categoryTotals[exp.category] += exp.amount;
            });

            return categoryTotals;
        } catch (error) {
            console.error('❌ שגיאה בקבלת הוצאות חודש נוכחי:', error.message);
            return {};
        }
    }

    /**
     * קבלת נתוני הוצאות היסטוריים
     */
    async getHistoricalExpenses(userId, months = 3) {
        try {
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);

            const expenses = await Transaction.find({
                userId,
                type: 'expense',
                date: { $gte: startDate }
            });

            return expenses;
        } catch (error) {
            console.error('❌ שגיאה בקבלת נתונים היסטוריים:', error.message);
            return [];
        }
    }

    /**
     * יצירת יעד חיסכון חדש - מעבר למצב המתנה לקלט
     */
    async handleGoalCreation(message) {
        try {
            const userId = message.from;

            // הוספה למצב המתנה
            this.awaitingGoalInput.add(userId);

            await message.reply(
                '🎯 *יצירת יעד חיסכון חדש*\n\n' +
                'בוא ננסח את היעד שלך!\n\n' +
                'כתוב בשפה טבעית, למשל:\n' +
                '• "אני רוצה לחסוך 5000 ש״ח לטיול ביוון עד 30.6.2026"\n' +
                '• "לחסוך 10000 למחשב חדש"\n' +
                '• "3000 שקל לקורס צילום עד סוף השנה"\n\n' +
                '_כתוב "ביטול" כדי לבטל_'
            );

        } catch (error) {
            console.error('❌ שגיאה ביצירת יעד:', error);
            await message.reply('⚠️ היתה בעיה ביצירת היעד');
        }
    }

    /**
     * עיבוד קלט יעד מהמשתמש
     */
    async processGoalInput(message) {
        try {
            const userId = message.from;
            const text = message.body.trim();

            // בדיקת ביטול
            if (text.toLowerCase() === 'ביטול' || text.toLowerCase() === 'cancel') {
                this.awaitingGoalInput.delete(userId);
                await message.reply('❌ יצירת היעד בוטלה');
                return;
            }

            await message.reply('🤔 מנתח את היעד...');

            // שימוש בפרסור AI
            const goalData = await this.aiService.parseGoalFromText(text);

            if (!goalData) {
                await message.reply(
                    '⚠️ לא הצלחתי להבין את היעד.\n\n' +
                    'אנא כתוב בצורה ברורה יותר, כולל:\n' +
                    '• סכום (למשל: 5000 ש״ח)\n' +
                    '• מטרה (למשל: טיול, מחשב)\n' +
                    '• תאריך (אופציונלי)\n\n' +
                    'נסה שוב או כתוב "ביטול"'
                );
                return;
            }

            // יצירת היעד
            const goal = await Goal.create({
                userId,
                ...goalData
            });

            // הסרה ממצב המתנה
            this.awaitingGoalInput.delete(userId);

            // הודעת אישור
            const progress = goal.getProgressSummary();
            let confirmMsg = `✅ *יעד נוצר בהצלחה!*\n\n`;
            confirmMsg += `🎯 *${goal.title}*\n`;

            if (goal.description && goal.description !== goal.title) {
                confirmMsg += `📝 ${goal.description}\n`;
            }

            confirmMsg += `💰 יעד: ${goal.targetAmount.toLocaleString()} ₪\n`;

            if (goal.deadline) {
                confirmMsg += `📅 תאריך יעד: ${goal.deadline.toLocaleDateString('he-IL')}\n`;
                confirmMsg += `⏰ זמן נותר: ${progress.timeRemaining.days} ימים\n\n`;
                confirmMsg += `📊 *יעדי חיסכון:*\n`;
                confirmMsg += `   • שבועי: ${progress.weeklyTarget.toLocaleString()} ₪\n`;
                confirmMsg += `   • חודשי: ${progress.monthlyTarget.toLocaleString()} ₪\n`;
            }

            confirmMsg += `\n💡 כתוב "היעדים" לראות את כל היעדים שלך`;

            await message.reply(confirmMsg);
            console.log(`✅ יעד חדש נוצר: ${goal.title} (${goal.targetAmount}₪)`);

        } catch (error) {
            console.error('❌ שגיאה בעיבוד יעד:', error);
            this.awaitingGoalInput.delete(message.from);
            await message.reply('⚠️ אופס, משהו השתבש. נסה שוב מאוחר יותר.');
        }
    }

    /**
     * הצגת כל היעדים
     */
    async showGoals(message) {
        try {
            const userId = message.from;
            const goals = await Goal.find({ userId, status: { $in: ['active', 'completed'] } })
                .sort({ createdAt: -1 });

            if (goals.length === 0) {
                await message.reply(
                    '🎯 *אין לך יעדי חיסכון עדיין*\n\n' +
                    'כתוב "/יעד" כדי ליצור יעד חדש!'
                );
                return;
            }

            let msg = '🎯 *היעדים שלי*\n\n';

            const activeGoals = goals.filter(g => g.status === 'active');
            const completedGoals = goals.filter(g => g.status === 'completed');

            if (activeGoals.length > 0) {
                msg += '📌 *יעדים פעילים:*\n\n';
                activeGoals.forEach((goal, idx) => {
                    const progress = goal.getProgressSummary();
                    const progressBar = this.createProgressBar(progress.percentage);

                    msg += `${idx + 1}. *${goal.title}*\n`;
                    msg += `   ${progressBar} ${progress.percentage}%\n`;
                    msg += `   💰 ${progress.current.toLocaleString()} / ${progress.target.toLocaleString()} ₪\n`;
                    msg += `   📅 נותר: ${progress.remaining.toLocaleString()} ₪\n`;

                    if (goal.deadline && progress.timeRemaining) {
                        if (progress.timeRemaining.expired) {
                            msg += `   ⏰ תאריך היעד עבר!\n`;
                        } else {
                            msg += `   ⏰ זמן: ${progress.timeRemaining.days} ימים (${progress.timeRemaining.weeks} שבועות)\n`;
                            msg += `   📊 יעד שבועי: ${progress.weeklyTarget.toLocaleString()} ₪\n`;
                        }
                    }
                    msg += '\n';
                });
            }

            if (completedGoals.length > 0) {
                msg += '\n✅ *יעדים שהושגו:*\n';
                completedGoals.slice(0, 3).forEach((goal) => {
                    msg += `   • ${goal.title} - ${goal.targetAmount.toLocaleString()} ₪\n`;
                });
            }

            await message.reply(msg);

        } catch (error) {
            console.error('❌ שגיאה בהצגת יעדים:', error);
            await message.reply('⚠️ היתה בעיה בהצגת היעדים');
        }
    }

    /**
     * הצגת התקדמות יעד ספציפי
     */
    async showGoalProgress(message) {
        try {
            const userId = message.from;
            const activeGoals = await Goal.find({ userId, status: 'active' })
                .sort({ createdAt: -1 });

            if (activeGoals.length === 0) {
                await message.reply('🎯 אין לך יעדים פעילים כרגע');
                return;
            }

            // נניח שרוצים לראות את היעד הראשון או האחרון שנוצר
            const goal = activeGoals[0];
            const progress = goal.getProgressSummary();

            let msg = `🎯 *${goal.title}*\n\n`;

            if (goal.description) {
                msg += `📝 ${goal.description}\n\n`;
            }

            const progressBar = this.createProgressBar(progress.percentage);
            msg += `${progressBar} *${progress.percentage}%*\n\n`;

            msg += `💰 *מצב כספי:*\n`;
            msg += `   נצבר: ${progress.current.toLocaleString()} ₪\n`;
            msg += `   יעד: ${progress.target.toLocaleString()} ₪\n`;
            msg += `   נותר: ${progress.remaining.toLocaleString()} ₪\n\n`;

            if (progress.timeRemaining && !progress.timeRemaining.expired) {
                msg += `⏰ *זמן נותר:*\n`;
                msg += `   ${progress.timeRemaining.days} ימים\n`;
                msg += `   (${progress.timeRemaining.weeks} שבועות)\n\n`;

                msg += `📊 *יעדי חיסכון:*\n`;
                msg += `   שבועי: ${progress.weeklyTarget.toLocaleString()} ₪\n`;
                msg += `   חודשי: ${progress.monthlyTarget.toLocaleString()} ₪\n\n`;

                // חישוב האם בקצב טוב
                const daysElapsed = Math.ceil((new Date() - goal.createdAt) / (1000 * 60 * 60 * 24));
                const expectedProgress = (daysElapsed / progress.timeRemaining.days) * 100;

                if (progress.percentage >= expectedProgress) {
                    msg += `🎉 אתה בקצב מעולה! `;
                    msg += `צפוי היה ${Math.round(expectedProgress)}% ואתה כבר ב-${progress.percentage}%`;
                } else {
                    const gap = Math.round(expectedProgress - progress.percentage);
                    msg += `⚠️ נחשול קצת - צפוי היה ${Math.round(expectedProgress)}%, חסרים ${gap}%`;
                }
            }

            await message.reply(msg);

        } catch (error) {
            console.error('❌ שגיאה בהצגת התקדמות:', error);
            await message.reply('⚠️ היתה בעיה בהצגת ההתקדמות');
        }
    }

    /**
     * יצירת פס התקדמות ויזואלי
     */
    createProgressBar(percentage) {
        const filled = Math.floor(percentage / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * מתן ייעוץ פיננסי אישי עם AI
     */
    async handleFinancialAdvice(message) {
        try {
            const userId = message.from;
            const question = message.body;

            await message.reply('🤔 בודק את המצב הפיננסי שלך...');

            // קבלת נתונים פיננסיים
            const budget = await Budget.findOne({ userId, setupCompleted: true });
            const monthlyStats = await getMonthlyStats(userId);
            const goals = await Goal.find({ userId, status: 'active' });

            // חישוב יתרה זמינה
            const availableBalance = monthlyStats.balance;

            // שליחה ל-AI לניתוח
            const prompt = `המשתמש שואל: "${question}"

נתונים פיננסיים:
- יתרה חודשית: ${availableBalance}₪
- הכנסות החודש: ${monthlyStats.income}₪
- הוצאות החודש: ${monthlyStats.expense}₪
${budget ? `- תקציב כולל: ${Object.values(budget.categories).reduce((a, b) => a + b, 0)}₪` : ''}
${goals.length > 0 ? `- יעדי חיסכון פעילים: ${goals.length}` : ''}

תן תשובה קצרה (2-3 משפטים) שהיא:
1. ישירה - כן/לא/אולי
2. מבוססת על המספרים
3. מציעה אלטרנטיבה אם הת שובה שלילית
4. בעברית בגוף שני`;

            const response = await this.aiService.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "אתה יועץ פיננסי אישי. תן עצות מבוססות מספרים, אמיתיות ומעודדות בעברית."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 250
            });

            const advice = response.choices[0].message.content.trim();
            await message.reply(`💡 *ייעוץ פיננסי אישי*\n\n${advice}`);

        } catch (error) {
            console.error('❌ שגיאה במתן ייעוץ:', error);
            await message.reply('⚠️ היתה בעיה במתן הייעוץ');
        }
    }

    /**
     * כיבוי הבוט
     */
    async stop() {
        try {
            await this.client.destroy();
            console.log('👋 הבוט כובה');
        } catch (error) {
            console.error('❌ שגיאה בכיבוי:', error);
        }
    }
}

module.exports = WhatsAppBot;