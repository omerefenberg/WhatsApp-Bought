/**
 * Reset Database Script
 * מנקה את כל הנתונים מהדאטאבייס ומאפס את המערכת לחדש
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');
const Goal = require('./models/Goal');

const resetDatabase = async () => {
    try {
        console.log('🔌 מתחבר למסד נתונים...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ מחובר בהצלחה!');

        // מחיקת כל הטרנזקציות
        console.log('\n🗑️  מוחק טרנזקציות...');
        const deletedTransactions = await Transaction.deleteMany({});
        console.log(`   ✅ נמחקו ${deletedTransactions.deletedCount} טרנזקציות`);

        // מחיקת כל התקציבים
        console.log('\n🗑️  מוחק תקציבים...');
        const deletedBudgets = await Budget.deleteMany({});
        console.log(`   ✅ נמחקו ${deletedBudgets.deletedCount} תקציבים`);

        // מחיקת כל היעדים
        console.log('\n🗑️  מוחק יעדים...');
        const deletedGoals = await Goal.deleteMany({});
        console.log(`   ✅ נמחקו ${deletedGoals.deletedCount} יעדים`);

        console.log('\n✨ איפוס בוצע בהצלחה!');
        console.log('📊 סטטיסטיקה:');
        console.log(`   - טרנזקציות: ${deletedTransactions.deletedCount}`);
        console.log(`   - תקציבים: ${deletedBudgets.deletedCount}`);
        console.log(`   - יעדים: ${deletedGoals.deletedCount}`);

        console.log('\n✅ המערכת מוכנה לשימוש חדש!');
        console.log('💡 הצעד הבא: הפעל את הבוט מחדש עם npm start');

    } catch (error) {
        console.error('\n❌ שגיאה באיפוס מסד הנתונים:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 התנתק ממסד הנתונים');
        process.exit(0);
    }
};

// בדיקה האם המשתמש בטוח
console.log('⚠️  אזהרה: פעולה זו תמחק את כל הנתונים מהדאטאבייס!');
console.log('📝 טרנזקציות, תקציבים ויעדים ימחקו לצמיתות.\n');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('❓ האם אתה בטוח שברצונך להמשיך? (כתוב "כן" כדי לאשר): ', (answer) => {
    readline.close();

    if (answer.toLowerCase() === 'כן' || answer.toLowerCase() === 'yes') {
        console.log('\n🚀 מתחיל איפוס...\n');
        resetDatabase();
    } else {
        console.log('\n❌ האיפוס בוטל על ידי המשתמש');
        process.exit(0);
    }
});
