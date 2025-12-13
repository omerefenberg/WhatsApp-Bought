/**
 * סקריפט לבדיקת התראות תקציב
 * להרצה: node test-budget-alerts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');

async function testBudgetAlerts() {
    try {
        console.log('🧪 מתחיל בדיקת התראות תקציב...\n');

        // התחברות ל-MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ מחובר ל-MongoDB\n');

        const budgets = await Budget.find({ setupCompleted: true });
        console.log(`📊 נמצאו ${budgets.length} משתמשים עם תקציב מוגדר\n`);

        if (budgets.length === 0) {
            console.log('⚠️ אין משתמשים לבדיקה.');
            process.exit(0);
        }

        for (const budget of budgets) {
            const userId = budget.userId;
            console.log('─'.repeat(70));
            console.log(`👤 משתמש: ${userId}`);
            console.log('─'.repeat(70));

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const categories = ['אוכל', 'תחבורה', 'קניות', 'חשבונות', 'בילויים', 'בריאות', 'כללי'];
            const alerts = [];

            // בדיקת כל קטגוריה
            for (const category of categories) {
                const categoryBudget = budget.categories[category];
                if (!categoryBudget || categoryBudget === 0) continue;

                const transactions = await Transaction.find({
                    userId,
                    type: 'expense',
                    category,
                    date: { $gte: startOfMonth }
                });

                const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
                const percentage = Math.round((totalSpent / categoryBudget) * 100);
                const remaining = categoryBudget - totalSpent;

                console.log(`\n📋 ${category}:`);
                console.log(`   תקציב: ${categoryBudget.toLocaleString()} ₪`);
                console.log(`   הוצאות: ${totalSpent.toLocaleString()} ₪`);
                console.log(`   נותרו: ${remaining.toLocaleString()} ₪`);
                console.log(`   ניצול: ${percentage}%`);

                if (percentage >= 100) {
                    console.log(`   🚨 סטטוס: חריגה!`);
                    alerts.push({
                        type: 'over',
                        category,
                        percentage,
                        remaining: Math.abs(remaining),
                        budget: categoryBudget,
                        spent: totalSpent
                    });
                } else if (percentage >= 85) {
                    console.log(`   ⚠️ סטטוס: קרוב לגבול`);
                    alerts.push({
                        type: 'warning',
                        category,
                        percentage,
                        remaining,
                        budget: categoryBudget,
                        spent: totalSpent
                    });
                } else {
                    console.log(`   ✅ סטטוס: בטוח`);
                }
            }

            // הצגת הודעת התראה
            if (alerts.length > 0) {
                console.log('\n' + '═'.repeat(70));
                console.log('📱 הודעת התראה שתישלח:');
                console.log('═'.repeat(70));

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

                console.log(message);
                console.log('═'.repeat(70));
            } else {
                console.log('\n✅ כל הקטגוריות בטוחות - אין התראות לשליחה');
            }

            console.log('\n');
        }

        console.log('✅ בדיקה הושלמה בהצלחה!');

    } catch (error) {
        console.error('❌ שגיאה בבדיקה:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 התנתק מ-MongoDB');
        process.exit(0);
    }
}

testBudgetAlerts();
