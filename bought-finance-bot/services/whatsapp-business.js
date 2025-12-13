const axios = require('axios');
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

class WhatsAppBusinessAPI {
    constructor(config) {
        this.apiVersion = config.apiVersion;
        this.accessToken = config.accessToken;
        this.phoneNumberId = config.phoneNumberId;
        this.businessAccountId = config.businessAccountId;
        this.verifyToken = config.verifyToken;

        this.baseURL = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
        this.aiService = new AIService(config.openaiApiKey);

        // מעקב אחר משתמשים שממתינים לכתוב יעד
        this.awaitingGoalInput = new Set();

        console.log('✅ WhatsApp Business API initialized');
    }

    /**
     * אימות webhook (GET request מ-Meta)
     */
    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === this.verifyToken) {
            console.log('✅ Webhook verified successfully');
            return challenge;
        }
        console.log('❌ Webhook verification failed');
        return null;
    }

    /**
     * טיפול בהודעה נכנסת מ-webhook
     */
    async handleIncomingWebhook(body) {
        try {
            // בדיקה שזה webhook של WhatsApp
            if (body.object !== 'whatsapp_business_account') {
                return;
            }

            // עבור על כל ה-entries
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.field === 'messages') {
                        const value = change.value;

                        // בדיקה שיש הודעות
                        if (value.messages && value.messages.length > 0) {
                            for (const message of value.messages) {
                                await this.processMessage(message, value.contacts[0]);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error handling webhook:', error);
        }
    }

    /**
     * עיבוד הודעה בודדת
     */
    async processMessage(message, contact) {
        try {
            const userId = message.from; // מספר הטלפון של השולח
            const messageId = message.id;

            console.log(`📩 הודעה מ-${userId}: ${message.type}`);

            // בדיקה אם זה הודעת תמונה (קבלה)
            if (message.type === 'image') {
                await this.handleImageMessage(message, userId);
                return;
            }

            // בדיקה אם זה הודעת טקסט
            if (message.type === 'text') {
                await this.handleTextMessage(message, userId);
                return;
            }

            console.log(`⚠️ סוג הודעה לא נתמך: ${message.type}`);
        } catch (error) {
            console.error('❌ Error processing message:', error);
            await this.sendMessage(message.from, '⚠️ מצטער, היתה בעיה בעיבוד ההודעה. נסה שוב.');
        }
    }

    /**
     * טיפול בהודעת טקסט
     */
    async handleTextMessage(message, userId) {
        const text = message.text.body.trim();

        console.log(`💬 טקסט: "${text}"`);

        // בדיקה אם המשתמש ממתין להזין יעד
        if (this.awaitingGoalInput.has(userId)) {
            await this.processGoalInput(text, userId);
            return;
        }

        // בדיקה אם המשתמש צריך להגדיר תקציב
        const userBudget = await Budget.findOne({ userId });

        if (!userBudget || !userBudget.setupCompleted) {
            await this.handleBudgetSetup(text, userId, userBudget);
            return;
        }

        // פקודת עזרה
        if (text === '/עזרה' || text === 'עזרה' || text === '?' || text === '/help') {
            await this.sendHelpMessage(userId);
            return;
        }

        // פקודת הגדרת תקציב מחדש
        if (text === '/תקציב' || text === 'תקציב חדש' || text === 'הגדר תקציב') {
            await this.resetBudgetSetup(userId);
            await this.sendMessage(userId, '🔄 אוקיי, בוא נגדיר את התקציב מחדש!\n\nכמה אתה רוצה להוציא על *אוכל* בחודש? (בשקלים)');
            return;
        }

        // סטטיסטיקות יומיות
        if (text.includes('היום') || text.includes('כמה הוצאתי היום')) {
            await this.sendDailyStats(userId);
            return;
        }

        // סטטיסטיקות שבועיות
        if (text.includes('השבוע') || text.includes('שבועי')) {
            await this.sendWeeklyStats(userId);
            return;
        }

        // סטטיסטיקות חודשיות
        if (text.includes('החודש') || text.includes('כמה הוצאתי') ||
            text.includes('מצב') || text.includes('סיכום')) {
            await this.sendMonthlyStats(userId);
            return;
        }

        // סטטיסטיקות קטגוריות
        if (text.includes('קטגוריות') || text.includes('פירוט')) {
            await this.sendCategoryStats(userId);
            return;
        }

        // ניהול יעדי חיסכון
        if (text.includes('/יעד') || text.includes('יעד חדש')) {
            await this.handleGoalCreation(userId);
            return;
        }

        if (text.includes('היעדים') || text.includes('רשימת יעדים')) {
            await this.showGoals(userId);
            return;
        }

        // ניתוח הודעה רגילה עם AI
        await this.processFinancialMessage(text, userId);
    }

    /**
     * טיפול בהודעת תמונה (קבלה)
     */
    async handleImageMessage(message, userId) {
        try {
            console.log('📸 מעבד תמונת קבלה...');

            await this.sendMessage(userId, '📸 מעבד את הקבלה... רגע אחד');

            // הורדת התמונה
            const imageUrl = await this.getMediaUrl(message.image.id);
            const imageBuffer = await this.downloadMedia(imageUrl);
            const imageBase64 = imageBuffer.toString('base64');

            // ניתוח הקבלה עם AI
            const transaction = await this.aiService.parseReceipt(imageBase64);

            if (!transaction) {
                await this.sendMessage(userId, '⚠️ לא הצלחתי לזהות מידע פיננסי בקבלה.\n\nטיפ: ודא שהקבלה ברורה ושהסכום הכולל נראה בבירור.');
                return;
            }

            // שמירה במסד נתונים
            const saved = await Transaction.create({
                ...transaction,
                userId,
                source: 'whatsapp-business-api'
            });

            console.log(`💾 נשמר מקבלה: ${saved.description} - ${saved.amount}₪`);

            // תגובה למשתמש
            const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
            let reply = `✅ קלטתי את הקבלה!\n\n` +
                `${typeEmoji} ${transaction.description}\n` +
                `📁 ${transaction.category}\n` +
                `💵 ${transaction.amount.toLocaleString()}₪`;

            if (transaction.merchant) {
                reply += `\n🏪 ${transaction.merchant}`;
            }

            await this.sendMessage(userId, reply);

            // בדיקת חריגה מתקציב
            if (transaction.type === 'expense') {
                await this.checkBudgetAlert(userId, transaction.category);
            }

        } catch (error) {
            console.error('❌ שגיאה בעיבוד קבלה:', error);
            await this.sendMessage(userId, '⚠️ מצטער, היתה בעיה בעיבוד הקבלה. נסה שוב או כתוב את ההוצאה ידנית.');
        }
    }

    /**
     * עיבוד הודעה פיננסית
     */
    async processFinancialMessage(text, userId) {
        try {
            const transaction = await this.aiService.parseTransaction(text);

            if (!transaction) {
                return;
            }

            // שמירה במסד נתונים
            const saved = await Transaction.create({
                ...transaction,
                userId,
                source: 'whatsapp-business-api'
            });

            console.log(`💾 נשמר: ${saved.description} - ${saved.amount}₪`);

            // תגובה למשתמש
            const typeEmoji = transaction.type === 'income' ? '💰' : '💸';
            let reply = `✅ רשמתי:\n` +
                `${typeEmoji} ${transaction.description}\n` +
                `📁 ${transaction.category}\n` +
                `💵 ${transaction.amount.toLocaleString()}₪`;

            await this.sendMessage(userId, reply);

            // בדיקת חריגה מתקציב
            if (transaction.type === 'expense') {
                await this.checkBudgetAlert(userId, transaction.category);
            }

        } catch (error) {
            console.error('❌ שגיאה בעיבוד:', error);
            throw error;
        }
    }

    /**
     * טיפול בהגדרת תקציב
     */
    async handleBudgetSetup(text, userId, userBudget) {
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
                phoneNumber: userId,
                setupStep: 0
            });

            await this.sendMessage(userId,
                '👋 *ברוך הבא ל-Bought!*\n\n' +
                'הבוט החכם לניהול פיננסי 💰\n\n' +
                'לפני שנתחיל, בוא נגדיר את התקציב החודשי שלך.\n\n' +
                'כמה אתה רוצה להוציא על *🍔 אוכל* בחודש?\n' +
                '_(כתוב רק את הסכום במספרים, לדוגמה: 2000)_'
            );
            return;
        }

        const currentStep = userBudget.setupStep;
        const amount = parseInt(text.replace(/[^\d]/g, ''));

        // אם הסכום לא תקין
        if (isNaN(amount) || amount < 0) {
            await this.sendMessage(userId, '❌ אנא כתוב סכום תקין במספרים בלבד (לדוגמה: 1500)');
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

            await this.sendMessage(userId, summary);
            return;
        }

        // המשך לקטגוריה הבאה
        await userBudget.save();
        const nextCategory = categories[userBudget.setupStep];
        const emoji = categoryEmojis[nextCategory];

        await this.sendMessage(userId,
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
     * בדיקה והתראה על חריגה מתקציב
     */
    async checkBudgetAlert(userId, category) {
        try {
            const userBudget = await Budget.findOne({ userId, setupCompleted: true });

            if (!userBudget) return;

            const categoryBudget = userBudget.categories[category];
            if (!categoryBudget || categoryBudget === 0) return;

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const transactions = await Transaction.find({
                userId,
                type: 'expense',
                category,
                date: { $gte: startOfMonth }
            });

            const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
            const percentage = Math.round((totalSpent / categoryBudget) * 100);
            const remaining = categoryBudget - totalSpent;

            // התראות לפי אחוזים
            if (percentage >= 100) {
                await this.sendMessage(userId,
                    `🚨 *התראת תקציב!*\n\n` +
                    `חרגת מהתקציב של *${category}*!\n` +
                    `💰 תקציב: ${categoryBudget.toLocaleString()} ₪\n` +
                    `💸 הוצאת: ${totalSpent.toLocaleString()} ₪\n` +
                    `📊 חריגה: ${Math.abs(remaining).toLocaleString()} ₪ (${percentage}%)`
                );
            } else if (percentage >= 90) {
                await this.sendMessage(userId,
                    `⚠️ *התראת תקציב!*\n\n` +
                    `נותרו רק ${remaining.toLocaleString()} ₪ בתקציב ${category}\n` +
                    `📊 ניצלת ${percentage}% מהתקציב`
                );
            } else if (percentage >= 75) {
                await this.sendMessage(userId,
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
    async sendDailyStats(userId) {
        try {
            const stats = await getDailyStats(userId);
            const formatted = formatStatsMessage(stats, 'היום');
            await this.sendMessage(userId, formatted);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות יומיות:', error);
            await this.sendMessage(userId, '⚠️ שגיאה בשליפת נתונים יומיים');
        }
    }

    /**
     * שליחת סטטיסטיקות שבועיות
     */
    async sendWeeklyStats(userId) {
        try {
            const stats = await getWeeklyStats(userId);
            const formatted = formatStatsMessage(stats, 'השבוע');
            await this.sendMessage(userId, formatted);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות שבועיות:', error);
            await this.sendMessage(userId, '⚠️ שגיאה בשליפת נתונים שבועיים');
        }
    }

    /**
     * שליחת סטטיסטיקות חודשיות
     */
    async sendMonthlyStats(userId) {
        try {
            const stats = await getMonthlyStats(userId);
            const formatted = formatStatsMessage(stats, 'החודש');
            await this.sendMessage(userId, formatted);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות חודשיות:', error);
            await this.sendMessage(userId, '⚠️ שגיאה בשליפת נתונים חודשיים');
        }
    }

    /**
     * שליחת סטטיסטיקות לפי קטגוריות
     */
    async sendCategoryStats(userId) {
        try {
            const stats = await getCategoryStats(userId);

            if (stats.length === 0) {
                await this.sendMessage(userId, '📊 אין עדיין הוצאות החודש');
                return;
            }

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

            const totalExpense = stats.reduce((sum, cat) => sum + cat.value, 0);

            let msg = '*ההוצאות החודשיות שלי*\n\n';

            stats.forEach(cat => {
                const emoji = categoryEmojis[cat.name] || '📌';
                const amount = cat.value.toLocaleString();
                msg += `${emoji}  ${cat.name.padEnd(12, ' ')}${amount} ש״ח\n`;
            });

            msg += `\n━━━━━━━━━━━━━━━━━\n`;
            msg += `*סה״כ  ${totalExpense.toLocaleString()} ש״ח*`;

            await this.sendMessage(userId, msg);
        } catch (error) {
            console.error('❌ שגיאה בסטטיסטיקות קטגוריות:', error);
            await this.sendMessage(userId, '⚠️ שגיאה בשליפת נתוני קטגוריות');
        }
    }

    /**
     * שליחת הודעת עזרה
     */
    async sendHelpMessage(userId) {
        const helpText = `🤖 *Bought - מדריך שימוש*

📝 *רישום הוצאות:*
• כתוב בשפה טבעית: "קניתי קפה ב-18 שקל"
• 📸 *צלם קבלה* - הבוט יחלץ את הפרטים אוטומטית!

📊 *סטטיסטיקות:*
• "כמה הוצאתי" / "מצב" - סיכום חודשי
• "היום" - סיכום יומי
• "השבוע" - סיכום שבועי
• "קטגוריות" - פירוט לפי קטגוריות

🎯 *יעדי חיסכון:*
• "/יעד" - הגדרת יעד חיסכון חדש
• "היעדים" - צפייה בכל היעדים

💰 *ניהול תקציב:*
• "/תקציב" - הגדרת תקציב מחדש
• התראות אוטומטיות על חריגות

_הקלד /עזרה בכל עת לראות הודעה זו_`;

        await this.sendMessage(userId, helpText);
    }

    /**
     * יצירת יעד חיסכון
     */
    async handleGoalCreation(userId) {
        this.awaitingGoalInput.add(userId);

        await this.sendMessage(userId,
            '🎯 *יצירת יעד חיסכון חדש*\n\n' +
            'בוא ננסח את היעד שלך!\n\n' +
            'כתוב בשפה טבעית, למשל:\n' +
            '• "אני רוצה לחסוך 5000 ש״ח לטיול ביוון עד 30.6.2026"\n' +
            '• "לחסוך 10000 למחשב חדש"\n\n' +
            '_כתוב "ביטול" כדי לבטל_'
        );
    }

    /**
     * עיבוד קלט יעד
     */
    async processGoalInput(text, userId) {
        try {
            if (text.toLowerCase() === 'ביטול' || text.toLowerCase() === 'cancel') {
                this.awaitingGoalInput.delete(userId);
                await this.sendMessage(userId, '❌ יצירת היעד בוטלה');
                return;
            }

            await this.sendMessage(userId, '🤔 מנתח את היעד...');

            const goalData = await this.aiService.parseGoalFromText(text);

            if (!goalData) {
                await this.sendMessage(userId,
                    '⚠️ לא הצלחתי להבין את היעד.\n\n' +
                    'אנא כתוב בצורה ברורה יותר, כולל:\n' +
                    '• סכום (למשל: 5000 ש״ח)\n' +
                    '• מטרה (למשל: טיול, מחשב)\n\n' +
                    'נסה שוב או כתוב "ביטול"'
                );
                return;
            }

            const goal = await Goal.create({
                userId,
                ...goalData
            });

            this.awaitingGoalInput.delete(userId);

            const progress = goal.getProgressSummary();
            let confirmMsg = `✅ *יעד נוצר בהצלחה!*\n\n`;
            confirmMsg += `🎯 *${goal.title}*\n`;
            confirmMsg += `💰 יעד: ${goal.targetAmount.toLocaleString()} ₪\n`;

            if (goal.deadline) {
                confirmMsg += `📅 תאריך יעד: ${goal.deadline.toLocaleDateString('he-IL')}\n`;
            }

            confirmMsg += `\n💡 כתוב "היעדים" לראות את כל היעדים שלך`;

            await this.sendMessage(userId, confirmMsg);

        } catch (error) {
            console.error('❌ שגיאה בעיבוד יעד:', error);
            this.awaitingGoalInput.delete(userId);
            await this.sendMessage(userId, '⚠️ אופס, משהו השתבש. נסה שוב מאוחר יותר.');
        }
    }

    /**
     * הצגת יעדים
     */
    async showGoals(userId) {
        try {
            const goals = await Goal.find({ userId, status: { $in: ['active', 'completed'] } })
                .sort({ createdAt: -1 });

            if (goals.length === 0) {
                await this.sendMessage(userId,
                    '🎯 *אין לך יעדי חיסכון עדיין*\n\n' +
                    'כתוב "/יעד" כדי ליצור יעד חדש!'
                );
                return;
            }

            let msg = '🎯 *היעדים שלי*\n\n';

            const activeGoals = goals.filter(g => g.status === 'active');

            if (activeGoals.length > 0) {
                msg += '📌 *יעדים פעילים:*\n\n';
                activeGoals.forEach((goal, idx) => {
                    const progress = goal.getProgressSummary();
                    const progressBar = this.createProgressBar(progress.percentage);

                    msg += `${idx + 1}. *${goal.title}*\n`;
                    msg += `   ${progressBar} ${progress.percentage}%\n`;
                    msg += `   💰 ${progress.current.toLocaleString()} / ${progress.target.toLocaleString()} ₪\n\n`;
                });
            }

            await this.sendMessage(userId, msg);

        } catch (error) {
            console.error('❌ שגיאה בהצגת יעדים:', error);
            await this.sendMessage(userId, '⚠️ היתה בעיה בהצגת היעדים');
        }
    }

    /**
     * יצירת פס התקדמות
     */
    createProgressBar(percentage) {
        const filled = Math.floor(percentage / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * קבלת URL של מדיה
     */
    async getMediaUrl(mediaId) {
        try {
            const response = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            return response.data.url;
        } catch (error) {
            console.error('❌ Error getting media URL:', error);
            throw error;
        }
    }

    /**
     * הורדת מדיה
     */
    async downloadMedia(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                responseType: 'arraybuffer'
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error('❌ Error downloading media:', error);
            throw error;
        }
    }

    /**
     * שליחת הודעה
     */
    async sendMessage(to, text) {
        try {
            const response = await axios.post(
                `${this.baseURL}/messages`,
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: to,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: text
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            console.log(`✅ הודעה נשלחה ל-${to}`);
            return response.data;
        } catch (error) {
            console.error('❌ Error sending message:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * סימון הודעה כנקראה
     */
    async markAsRead(messageId) {
        try {
            await axios.post(
                `${this.baseURL}/messages`,
                {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
        } catch (error) {
            console.error('❌ Error marking message as read:', error);
        }
    }
}

module.exports = WhatsAppBusinessAPI;
