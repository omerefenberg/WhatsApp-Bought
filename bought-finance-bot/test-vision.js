require('dotenv').config();
const OpenAI = require('openai');

async function testVisionAPI() {
    console.log('🧪 בודק Vision API...\n');

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('❌ OPENAI_API_KEY לא מוגדר');
        process.exit(1);
    }

    console.log('✅ API Key נמצא:', apiKey.substring(0, 20) + '...');

    const openai = new OpenAI({ apiKey });

    try {
        console.log('\n📡 שולח בקשת טסט ל-Vision API...');

        // תמונה פשוטה לטסט (1x1 pixel לבן)
        const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "What color is this pixel? Just say the color."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${testImage}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 50
        });

        console.log('✅ Vision API עובד!');
        console.log('📝 תגובה:', response.choices[0].message.content);
        console.log('\n🎉 המערכת תקינה! הבוט אמור לעבוד עם תמונות.');

    } catch (error) {
        console.error('\n❌ שגיאה:', error.message);

        if (error.code === 'insufficient_quota') {
            console.error('💰 אין מספיק קרדיט בחשבון OpenAI');
            console.error('💡 פתרון: הוסף אמצעי תשלום ב-https://platform.openai.com/account/billing');
        } else if (error.status === 401) {
            console.error('🔑 API Key לא תקין');
        } else if (error.status === 429) {
            console.error('⏱️ יותר מדי בקשות - נסה שוב בעוד דקה');
        } else if (error.status === 400 && error.message.includes('model')) {
            console.error('🤖 אין גישה למודל gpt-4o - ייתכן שהחשבון לא מאושר');
            console.error('💡 פתרון: בדוק ב-https://platform.openai.com/ אם יש לך גישה ל-GPT-4 Vision');
        } else {
            console.error('פרטים נוספים:', error);
        }

        process.exit(1);
    }
}

testVisionAPI();
