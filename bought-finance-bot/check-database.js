require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');
const Goal = require('./models/Goal');

async function checkDatabase() {
    try {
        console.log('🔌 מתחבר ל-MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ מחובר בהצלחה\n');

        // ספירת טרנזקציות
        const transactionCount = await Transaction.countDocuments();
        console.log(`📊 טרנזקציות: ${transactionCount}`);

        if (transactionCount > 0) {
            // מציאת כל ה-userId השונים
            const userIds = await Transaction.distinct('userId');
            console.log(`\n👥 משתמשים (userId) במערכת: ${userIds.length}`);

            for (const userId of userIds) {
                const count = await Transaction.countDocuments({ userId });
                console.log(`   - ${userId}: ${count} טרנזקציות`);
            }

            // טרנזקציות אחרונות
            console.log('\n📝 5 הטרנזקציות האחרונות:');
            const recentTransactions = await Transaction.find()
                .sort({ date: -1 })
                .limit(5);

            recentTransactions.forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.description} - ₪${t.amount} (${t.category}) [${t.userId}]`);
            });
        }

        // ספירת תקציבים
        const budgetCount = await Budget.countDocuments();
        console.log(`\n💰 תקציבים: ${budgetCount}`);

        // ספירת יעדים
        const goalCount = await Goal.countDocuments();
        console.log(`🎯 יעדים: ${goalCount}`);

        console.log('\n✅ סיימתי לבדוק\n');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ שגיאה:', error.message);
        process.exit(1);
    }
}

checkDatabase();
