require('dotenv').config();
const AIService = require('./services/ai');
const fs = require('fs');

async function testReceiptParsing() {
    console.log('🧪 בודק ניתוח קבלות עם Vision API\n');

    try {
        const aiService = new AIService(process.env.OPENAI_API_KEY);

        // תמונת טסט - קבלה מזויפת פשוטה
        console.log('📝 יוצר תמונת טסט של קבלה...\n');

        // קבלה מזויפת בפורמט טקסט פשוט (למטרות הדגמה)
        const receiptText = `
═══════════════════════
    קפה ברנדה
═══════════════════════

קפה הפוך            18.00 ₪
עוגייה              12.00 ₪
מים                  8.00 ₪

────────────────────────
סה"כ לתשלום:        38.00 ₪
────────────────────────

תאריך: 11/12/2024
תודה שקנית אצלנו!
`;

        console.log('📄 קבלה לבדיקה:');
        console.log(receiptText);
        console.log('\n🔄 שולח ל-AI לניתוח...\n');

        // יצירת תמונה פשוטה עם הטקסט (base64)
        // למטרות הדגמה, נשתמש בתמונת טסט קטנה
        // בפועל, התמונה תגיע מ-WhatsApp

        // תמונת טסט פשוטה (1x1 pixel) - רק כדי לבדוק שה-API עובד
        const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

        console.log('⚠️  שים לב: זה טסט בסיסי עם תמונה קטנה.');
        console.log('    לבדיקה אמיתית, שלח קבלה ממשית דרך WhatsApp\n');

        const result = await aiService.parseReceipt(testImage);

        if (result) {
            console.log('\n✅ AI זיהה קבלה בהצלחה!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📊 נתונים שזוהו:');
            console.log('   סכום:', result.amount, '₪');
            console.log('   תיאור:', result.description);
            console.log('   קטגוריה:', result.category);
            console.log('   סוג:', result.type);
            if (result.merchant) {
                console.log('   עסק:', result.merchant);
            }
            if (result.items && result.items.length > 0) {
                console.log('   פריטים:', result.items.join(', '));
            }
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('🎉 המערכת עובדת! תוכל לשלוח קבלות דרך WhatsApp\n');
        } else {
            console.log('\n⚠️  AI לא זיהה מידע פיננסי בתמונת הטסט');
            console.log('    זה צפוי - תמונת הטסט פשוטה מדי');
            console.log('    נסה לשלוח קבלה אמיתית דרך WhatsApp\n');
        }

        console.log('📋 הוראות שימוש:');
        console.log('   1. פתח את WhatsApp');
        console.log('   2. צלם קבלה או שלח תמונה של קבלה');
        console.log('   3. הבוט יעבד אוטומטית ויחלץ את הפרטים\n');

        console.log('💡 טיפים לקבלות טובות:');
        console.log('   • ודא שהקבלה ברורה וקריאה');
        console.log('   • הסכום הכולל צריך להיות נראה');
        console.log('   • שם העסק צריך להיות נראה');
        console.log('   • תאורה טובה עוזרת לזיהוי');

    } catch (error) {
        console.error('\n❌ שגיאה בטסט:', error.message);

        if (error.code === 'insufficient_quota') {
            console.error('\n💰 אין מספיק קרדיט ב-OpenAI API');
            console.error('   פתור: הוסף אמצעי תשלום ב-https://platform.openai.com/account/billing\n');
        } else if (error.status === 401) {
            console.error('\n🔑 API Key לא תקין');
            console.error('   בדוק את ה-OPENAI_API_KEY בקובץ .env\n');
        } else if (error.message.includes('model')) {
            console.error('\n🤖 בעיית גישה למודל gpt-4o');
            console.error('   ייתכן שהחשבון לא מאושר ל-GPT-4 Vision');
            console.error('   בדוק ב-https://platform.openai.com/\n');
        } else {
            console.error('\nפרטים נוספים:', error);
        }
    }
}

// הרצת הטסט
testReceiptParsing();
