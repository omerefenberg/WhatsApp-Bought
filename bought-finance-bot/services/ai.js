const OpenAI = require('openai');

class AIService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required');
        }
        this.openai = new OpenAI({ apiKey });
    }

    /**
     * ניתוח הודעה והפקת טרנזקציה
     */
    async parseTransaction(messageText) {
        try {
            console.log(`🧠 מנתח הודעה: "${messageText}"`);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt()
                    },
                    {
                        role: "user",
                        content: messageText
                    }
                ],
                temperature: 0,
                max_tokens: 200,
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            const cleanJson = content.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            // וולידציה
            if (!data.type || data.type === null) {
                console.log("🤷‍♂️ לא נמצא מידע פיננסי בהודעה");
                return null;
            }

            // וולידציה נוספת
            if (!this.isValidTransaction(data)) {
                console.log("⚠️ נתונים לא תקינים מה-AI");
                return null;
            }

            console.log(`✅ זוהה: ${data.description} - ${data.amount}₪`);
            return data;

        } catch (error) {
            console.error("❌ שגיאה בניתוח AI:", error.message);

            // טיפול בשגיאות ספציפיות של OpenAI
            if (error.code === 'insufficient_quota') {
                console.error("💰 אין מספיק קרדיט ב-OpenAI API");
                throw new Error('שגיאת מכסה - אנא בדוק את חשבון OpenAI');
            }

            if (error.code === 'invalid_api_key') {
                console.error("🔑 מפתח API לא תקין");
                throw new Error('מפתח API לא חוקי');
            }

            if (error.status === 429) {
                console.error("⏱️ יותר מדי בקשות ל-OpenAI");
                throw new Error('יותר מדי בקשות, נסה שוב בעוד כמה שניות');
            }

            if (error.status >= 500) {
                console.error("🔧 שגיאת שרת OpenAI");
                throw new Error('שגיאת שרת OpenAI, נסה שוב מאוחר יותר');
            }

            if (error instanceof SyntaxError) {
                console.error("📝 תגובת AI לא תקינה - לא ניתן לפענח JSON");
                return null;
            }

            throw error;
        }
    }

    /**
     * הגדרת ה-System Prompt
     */
    getSystemPrompt() {
        return `You are a Hebrew financial text analyzer. Identify financial transactions and return ONLY valid JSON.

CRITICAL: You must ALWAYS return a valid JSON object, nothing else.

Response format (JSON only):
{
  "amount": number (positive),
  "description": "short description in Hebrew (max 50 chars)",
  "category": "category in Hebrew",
  "type": "expense" or "income"
}

חוקים קפדניים:
1. "category" חייבת להיות אחת מהאופציות הבאות בלבד:
   - "אוכל" (אוכל, שתייה, מסעדות, קפה)
   - "תחבורה" (דלק, אוטובוס, מונית, רכב)
   - "קניות" (בגדים, אלקטרוניקה, ציוד)
   - "חשבונות" (חשמל, מים, אינטרנט, טלפון, ארנונה, שכירות, שכר דירה, דמי שכירות)
   - "בילויים" (קולנוע, פאב, בר, אירועים)
   - "משכורת" (שכר, הכנסה)
   - "בריאות" (רופא, תרופות, ביטוח)
   - "כללי" (כל דבר אחר)

2. "type":
   - "expense" = הוצאה (רכישה, תשלום)
   - "income" = הכנסה (משכורת, החזר, קבלת כסף)
   - null = אין מידע פיננסי

3. אם אין מידע פיננסי בהודעה, החזר: {"type": null}

Examples:
- "קניתי קפה ב-18 שקל" → {"amount": 18, "description": "קפה", "category": "אוכל", "type": "expense"}
- "תדלוק 300 ש״ח" → {"amount": 300, "description": "תדלוק", "category": "תחבורה", "type": "expense"}
- "שכר דירה 4500 שקל" → {"amount": 4500, "description": "שכר דירה", "category": "חשבונות", "type": "expense"}
- "קיבלתי משכורת 15000" → {"amount": 15000, "description": "משכורת", "category": "משכורת", "type": "income"}
- "מה שלומך?" → {"type": null}

IMPORTANT: Always return valid JSON. If no financial info, return {"type": null}`;
    }

    /**
     * וולידציה של הטרנזקציה
     */
    isValidTransaction(data) {
        const validCategories = ['אוכל', 'תחבורה', 'קניות', 'חשבונות', 'בילויים', 'משכורת', 'בריאות', 'כללי'];
        const validTypes = ['income', 'expense'];

        return (
            data.amount > 0 &&
            data.description &&
            validCategories.includes(data.category) &&
            validTypes.includes(data.type)
        );
    }

    /**
     * ניתוח קבלה מתמונה עם Vision API
     */
    async parseReceipt(imageBase64) {
        try {
            console.log('📸 מנתח קבלה מתמונה עם GPT-4o Vision...');
            console.log(`📏 גודל תמונה: ${imageBase64.length} תווים base64`);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `You are a receipt analyzer. Extract financial information from receipt images and return ONLY valid JSON.

CRITICAL: Return ONLY a JSON object, no other text whatsoever.

JSON format:
{
  "amount": number (total amount),
  "description": "business/product description in Hebrew",
  "category": "category in Hebrew",
  "type": "expense",
  "items": ["item 1", "item 2"] (optional),
  "merchant": "business name" (optional),
  "date": "date" (optional)
}

Valid categories (MUST be one of these in Hebrew):
- "אוכל" (restaurants, supermarkets, coffee)
- "תחבורה" (gas, parking, taxis)
- "קניות" (clothing, electronics, equipment)
- "חשבונות" (electricity, water, phone, rent, bills)
- "בילויים" (cinema, bar, events)
- "בריאות" (doctor, medicine, insurance)
- "כללי" (anything else)

Rules:
1. Look for total amount (סה"כ, Total, תשלום)
2. Identify business name from logo/header
3. Determine category based on business type
4. If unclear or no receipt found, return: {"type": null}
5. IMPORTANT: Return ONLY the JSON object, no explanations`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this receipt and extract the financial information. Return ONLY valid JSON, nothing else."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            console.log('📨 תגובה מ-GPT-4o:', content ? content.substring(0, 200) : 'null');

            if (!content) {
                console.log("⚠️ AI לא החזיר תוכן - ייתכן שהתמונה לא ברורה או לא מכילה קבלה");
                return null;
            }

            const cleanJson = content.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            console.log('📋 נתונים שפוענחו:', JSON.stringify(data, null, 2));

            // וולידציה
            if (!data.type || data.type === null) {
                console.log("🤷‍♂️ לא נמצא מידע פיננסי בתמונה");
                return null;
            }

            if (!this.isValidTransaction(data)) {
                console.log("⚠️ נתונים לא תקינים מהקבלה");
                console.log("   סיבה: amount=" + data.amount + ", description=" + data.description + ", category=" + data.category + ", type=" + data.type);
                return null;
            }

            console.log(`✅ זוהה מקבלה: ${data.description} - ${data.amount}₪`);
            return data;

        } catch (error) {
            console.error("❌ שגיאה בניתוח קבלה:", error.message);

            // טיפול בשגיאות ספציפיות
            if (error.code === 'insufficient_quota') {
                console.error("💰 אין מספיק קרדיט ב-OpenAI API");
                throw new Error('שגיאת מכסה - אנא בדוק את חשבון OpenAI');
            }

            if (error.status === 429) {
                console.error("⏱️ יותר מדי בקשות ל-OpenAI");
                throw new Error('יותר מדי בקשות, נסה שוב בעוד כמה שניות');
            }

            if (error instanceof SyntaxError) {
                console.error("📝 תגובת AI לא תקינה - לא ניתן לפענח JSON");
                return null;
            }

            throw error;
        }
    }

    /**
     * יצירת סיכום חודשי בשפה טבעית עם תובנות AI
     */
    async generateMonthlySummaryWithInsights(userId, monthlyData, previousMonthData = null) {
        try {
            console.log(`🧠 מייצר סיכום חודשי חכם עבור משתמש ${userId}`);

            // הכנת הנתונים לפרומפט
            const prompt = this.buildMonthlySummaryPrompt(monthlyData, previousMonthData);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `אתה יועץ פיננסי אישי חכם ואמפתי. התפקיד שלך הוא לנתח נתונים פיננסיים ולתת תובנות מועילות בעברית.

עקרונות:
- תן תובנות אישיות ומעניינות, לא רק מספרים
- היה חיובי אבל אמיתי - שבח על הצלחות, הצע שיפורים בעדינות
- השתמש בשפה חמה ואנושית, לא רובוטית
- זהה דפוסים ומגמות מעניינות
- תן המלצות מעשיות וספציפיות
- השתמש באימוג'ים במידה (2-3 בסיכום)`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const summary = response.choices[0].message.content.trim();
            console.log(`✅ סיכום חודשי נוצר בהצלחה`);
            return summary;

        } catch (error) {
            console.error('❌ שגיאה ביצירת סיכום חודשי:', error.message);
            return null;
        }
    }

    /**
     * בניית פרומפט לסיכום חודשי
     */
    buildMonthlySummaryPrompt(monthlyData, previousMonthData) {
        const {
            totalBudget,
            totalSpent,
            totalSaved,
            overallPercentage,
            comparison,
            savedMoney
        } = monthlyData;

        let prompt = `נתח את המצב הפיננסי החודשי והפק סיכום קצר (3-4 משפטים) עם תובנות:

📊 נתוני החודש:
- תקציב כולל: ${totalBudget}₪
- הוצא בפועל: ${totalSpent}₪
- ${savedMoney ? `חסך: ${totalSaved}₪` : `חרג ב: ${Math.abs(totalSaved)}₪`}
- ניצול תקציב: ${overallPercentage}%

📁 פירוט קטגוריות:
`;

        comparison.forEach(cat => {
            const status = cat.overBudget ? '❌ חריגה' : cat.percentage >= 85 ? '⚠️ קרוב לגבול' : '✅ בגבולות';
            prompt += `- ${cat.category}: ${cat.spent}₪ מתוך ${cat.budget}₪ (${cat.percentage}%) ${status}\n`;
        });

        // אם יש נתונים מהחודש הקודם, הוסף השוואה
        if (previousMonthData) {
            const change = totalSpent - previousMonthData.totalSpent;
            const changePercent = previousMonthData.totalSpent > 0
                ? Math.round((change / previousMonthData.totalSpent) * 100)
                : 0;

            prompt += `\n📈 השוואה לחודש הקודם:
- חודש קודם: ${previousMonthData.totalSpent}₪
- חודש נוכחי: ${totalSpent}₪
- שינוי: ${change >= 0 ? '+' : ''}${change}₪ (${changePercent >= 0 ? '+' : ''}${changePercent}%)
`;
        }

        prompt += `\nצור סיכום קצר ואישי ש:
1. מתחיל בהערכה כללית (האם החודש היה טוב/כבד/מאתגר)
2. מזהה את הקטגוריה הבולטת ביותר (חיובית או שלילית)
3. נותן המלצה ספציפית אחת למיקוד בחודש הבא
4. מסיים במשפט מעודד

חשוב: כתוב בגוף ראשון (למשל "הצלחת לחסוך", "שמתי לב ש..."), היה אישי וחם.`;

        return prompt;
    }

    /**
     * ניתוח אנומליות בהוצאות
     */
    async detectAnomalies(userId, currentExpenses, historicalExpenses) {
        try {
            console.log(`🔍 מחפש אנומליות בהוצאות עבור משתמש ${userId}`);

            // חישוב ממוצע היסטורי לכל קטגוריה
            const categoryAverages = this.calculateCategoryAverages(historicalExpenses);
            const anomalies = [];

            // בדיקה לכל קטגוריה
            for (const [category, currentAmount] of Object.entries(currentExpenses)) {
                const average = categoryAverages[category] || 0;

                if (average > 0) {
                    const deviation = ((currentAmount - average) / average) * 100;

                    // אנומליה אם יש סטייה של יותר מ-50%
                    if (Math.abs(deviation) >= 50 && currentAmount >= 100) {
                        anomalies.push({
                            category,
                            current: currentAmount,
                            average,
                            deviation: Math.round(deviation),
                            type: deviation > 0 ? 'increase' : 'decrease'
                        });
                    }
                }
            }

            if (anomalies.length === 0) {
                return null;
            }

            // יצירת הודעה מותאמת אישית עם AI
            const prompt = `זוהו חריגות בהוצאות החודש. צור הודעת התראה קצרה (2-3 משפטים):

${anomalies.map(a =>
    `- ${a.category}: ${a.current}₪ (${a.deviation >= 0 ? '+' : ''}${a.deviation}% מהממוצע של ${a.average}₪)`
).join('\n')}

ההודעה צריכה:
1. להצביע על החריגה הכי משמעותית
2. להיות אובייקטיבית (לא לשפוט)
3. לשאול האם זה מכוון או בטעות`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "אתה מערכת התראות פיננסיות. תן התראות ברורות ומועילות בעברית." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.5,
                max_tokens: 150
            });

            return {
                anomalies,
                message: response.choices[0].message.content.trim()
            };

        } catch (error) {
            console.error('❌ שגיאה בזיהוי אנומליות:', error.message);
            return null;
        }
    }

    /**
     * חישוב ממוצע היסטורי לפי קטגוריה
     */
    calculateCategoryAverages(historicalExpenses) {
        const categoryTotals = {};
        const categoryCounts = {};

        historicalExpenses.forEach(expense => {
            const cat = expense.category;
            if (!categoryTotals[cat]) {
                categoryTotals[cat] = 0;
                categoryCounts[cat] = 0;
            }
            categoryTotals[cat] += expense.amount;
            categoryCounts[cat]++;
        });

        const averages = {};
        for (const [cat, total] of Object.entries(categoryTotals)) {
            averages[cat] = Math.round(total / categoryCounts[cat]);
        }

        return averages;
    }

    /**
     * המלצות חיסכון מותאמות אישית
     */
    async generateSavingsSuggestions(userId, expenses, budget) {
        try {
            console.log(`💡 מייצר המלצות חיסכון עבור משתמש ${userId}`);

            // מציאת הקטגוריות עם הכי הרבה הוצאות חוזרות
            const frequentExpenses = this.analyzeFrequentExpenses(expenses);

            if (frequentExpenses.length === 0) {
                return null;
            }

            const prompt = `נתח הוצאות חוזרות והמלץ על דרך אחת לחיסכון:

${frequentExpenses.map(f =>
    `- ${f.description}: ${f.count} פעמים בחודש, סה"כ ${f.total}₪ (ממוצע ${f.average}₪ לפעם)`
).join('\n')}

תן המלצה אחת ספציפית:
1. התמקד בהוצאה החוזרת הכי יקרה
2. הצע אלטרנטיבה מעשית לחיסכון
3. חשב כמה ניתן לחסוך בחודש/שנה
4. היה מעודד, לא מטיף

פורמט: 2-3 משפטים קצרים.`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "אתה יועץ חיסכון. תן עצות מעשיות ומעודדות בעברית." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 200
            });

            return response.choices[0].message.content.trim();

        } catch (error) {
            console.error('❌ שגיאה ביצירת המלצות חיסכון:', error.message);
            return null;
        }
    }

    /**
     * ניתוח הוצאות חוזרות
     */
    analyzeFrequentExpenses(expenses) {
        const descriptionMap = {};

        expenses.forEach(exp => {
            // נרמול תיאורים דומים (למשל "קפה", "קפה הפוך" -> "קפה")
            const normalized = exp.description.toLowerCase().split(' ')[0];

            if (!descriptionMap[normalized]) {
                descriptionMap[normalized] = {
                    description: exp.description,
                    count: 0,
                    total: 0,
                    category: exp.category
                };
            }

            descriptionMap[normalized].count++;
            descriptionMap[normalized].total += exp.amount;
        });

        // מיון לפי סכום כולל
        return Object.values(descriptionMap)
            .filter(item => item.count >= 3) // רק דברים שקרו 3+ פעמים
            .map(item => ({
                ...item,
                average: Math.round(item.total / item.count)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 3); // 3 הראשונות
    }

    /**
     * פרסור חכם ליצירת יעד חיסכון מטקסט חופשי
     */
    async parseGoalFromText(text) {
        try {
            console.log(`🎯 מפרסר יעד מטקסט: "${text}"`);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `אתה מפרסר יעדי חיסכון מטקסט בעברית. תחלץ את המידע הבא בפורמט JSON:
- title: כותרת קצרה ליעד (עד 50 תווים)
- description: תיאור מפורט יותר (אופציונלי)
- targetAmount: סכום היעד במספר (ללא מטבע)
- deadline: תאריך יעד בפורמט ISO (YYYY-MM-DD) או null אם לא צוין
- category: אחת מ: "טיול", "רכישה", "חירום", "השקעה", "כללי"

דוגמאות:
"אני רוצה לחסוך 5000 שקל לטיול ביוון עד 30.6.2026"
-> {"title": "טיול ביוון", "description": "חיסכון לטיול ביוון", "targetAmount": 5000, "deadline": "2026-06-30", "category": "טיול"}

"לחסוך 10000 למחשב חדש"
-> {"title": "מחשב חדש", "description": "קניית מחשב חדש", "targetAmount": 10000, "deadline": null, "category": "רכישה"}

אם לא ניתן לזהות יעד תקין, החזר null.`
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.3,
                max_tokens: 200
            });

            const content = response.choices[0].message.content.trim();
            const cleanJson = content.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            // ולידציה
            if (!data || !data.title || !data.targetAmount || data.targetAmount <= 0) {
                console.log('⚠️ לא ניתן לזהות יעד תקין');
                return null;
            }

            // המרת תאריך לאובייקט Date אם קיים
            if (data.deadline) {
                try {
                    data.deadline = new Date(data.deadline);
                    // בדיקה שהתאריך עתידי
                    if (data.deadline <= new Date()) {
                        console.log('⚠️ תאריך היעד חייב להיות עתידי');
                        data.deadline = null;
                    }
                } catch (e) {
                    console.log('⚠️ תאריך לא תקין, מתעלם');
                    data.deadline = null;
                }
            }

            console.log(`✅ יעד זוהה: ${data.title} - ${data.targetAmount}₪`);
            return data;

        } catch (error) {
            console.error('❌ שגיאה בפרסור יעד:', error.message);

            if (error instanceof SyntaxError) {
                console.error('📝 תגובת AI לא תקינה - לא ניתן לפענח JSON');
                return null;
            }

            return null;
        }
    }
}

module.exports = AIService;