/**
 * סקריפט לבדיקת תכונת הסיכום החודשי
 * להרצה: node test-monthly-report.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { getMonthlyBudgetComparison } = require('./utils/stats');

async function testMonthlyReport() {
    try {
        console.log('🧪 מתחיל בדיקת סיכום חודשי...\n');

        // התחברות ל-MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ מחובר ל-MongoDB\n');

        // קבלת כל המשתמשים
        const Budget = require('./models/Budget');
        const budgets = await Budget.find({ setupCompleted: true });

        console.log(`📊 נמצאו ${budgets.length} משתמשים עם תקציב מוגדר\n`);

        if (budgets.length === 0) {
            console.log('⚠️ אין משתמשים לבדיקה. נסה להגדיר תקציב דרך הבוט תחילה.');
            process.exit(0);
        }

        // בדיקה לכל משתמש
        for (const budget of budgets) {
            console.log('─'.repeat(60));
            console.log(`👤 משתמש: ${budget.userId}`);
            console.log('─'.repeat(60));

            const comparison = await getMonthlyBudgetComparison(budget.userId);

            if (!comparison) {
                console.log('⚠️ אין נתוני תקציב למשתמש זה\n');
                continue;
            }

            // הדפסת סיכום
            console.log('\n📊 סיכום כללי:');
            console.log(`   💰 תקציב כולל: ${comparison.totalBudget.toLocaleString()} ₪`);
            console.log(`   💸 סה״כ הוצאות: ${comparison.totalSpent.toLocaleString()} ₪`);
            console.log(`   ${comparison.savedMoney ? '🎉' : '⚠️'} ${comparison.savedMoney ? 'חסכון' : 'חריגה'}: ${Math.abs(comparison.totalSaved).toLocaleString()} ₪`);
            console.log(`   📈 ניצול: ${comparison.overallPercentage}%\n`);

            // פירוט קטגוריות
            console.log('📋 פירוט קטגוריות:');
            comparison.comparison.forEach(cat => {
                const status = cat.overBudget ? '🚨' : cat.percentage >= 90 ? '⚠️' : '✅';
                console.log(`   ${status} ${cat.category}:`);
                console.log(`      תקציב: ${cat.budget.toLocaleString()} ₪`);
                console.log(`      הוצאות: ${cat.spent.toLocaleString()} ₪`);
                console.log(`      ${cat.overBudget ? 'חריגה' : 'נותרו'}: ${Math.abs(cat.remaining).toLocaleString()} ₪ (${cat.percentage}%)`);
            });

            console.log('\n' + '═'.repeat(60) + '\n');

            // בניית הודעת דוגמה
            let message = '🎊 *סיכום חודשי - ' + new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) + '*\n\n';

            if (comparison.savedMoney) {
                message += `🎉 *כל הכבוד! חסכת ${comparison.totalSaved.toLocaleString()} ₪ החודש!*\n\n`;
            } else {
                message += `⚠️ *חרגת מהתקציב ב-${Math.abs(comparison.totalSaved).toLocaleString()} ₪*\n\n`;
            }

            message += `📊 *סיכום כללי:*\n`;
            message += `💰 תקציב: ${comparison.totalBudget.toLocaleString()} ₪\n`;
            message += `💸 הוצאת: ${comparison.totalSpent.toLocaleString()} ₪\n`;
            message += `📈 ניצול: ${comparison.overallPercentage}%\n\n`;

            const overBudgetCategories = comparison.comparison.filter(c => c.overBudget);
            const nearLimitCategories = comparison.comparison.filter(c => !c.overBudget && c.percentage >= 90);

            if (overBudgetCategories.length > 0) {
                message += `🚨 *קטגוריות שחרגת:*\n`;
                overBudgetCategories.forEach(cat => {
                    message += `   ${cat.category}: חריגה של ${Math.abs(cat.remaining).toLocaleString()} ₪ (${cat.percentage}%)\n`;
                });
                message += '\n';
            }

            if (nearLimitCategories.length > 0 && overBudgetCategories.length === 0) {
                message += `⚠️ *קטגוריות קרובות לגבול:*\n`;
                nearLimitCategories.forEach(cat => {
                    message += `   ${cat.category}: ${cat.percentage}% (נותרו ${cat.remaining.toLocaleString()} ₪)\n`;
                });
                message += '\n';
            }

            if (comparison.savedMoney) {
                message += `💡 *מעולה!* המשך כך גם בחודש הבא! 🚀`;
            } else {
                message += `💡 *טיפ:* נסה לצמצם הוצאות בקטגוריות שחרגת החודש הבא.`;
            }

            console.log('📱 הודעה שתישלח ב-WhatsApp:');
            console.log('─'.repeat(60));
            console.log(message);
            console.log('─'.repeat(60));
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

testMonthlyReport();
