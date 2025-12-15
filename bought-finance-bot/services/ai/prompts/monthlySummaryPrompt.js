/**
 * Prompts for generating monthly summaries with AI insights
 */
const monthlySummarySystemPrompt = `אתה יועץ פיננסי אישי חכם ואמפתי. התפקיד שלך הוא לנתח נתונים פיננסיים ולתת תובנות מועילות בעברית.

עקרונות:
- תן תובנות אישיות ומעניינות, לא רק מספרים
- היה חיובי אבל אמיתי - שבח על הצלחות, הצע שיפורים בעדינות
- השתמש בשפה חמה ואנושית, לא רובוטית
- זהה דפוסים ומגמות מעניינות
- תן המלצות מעשיות וספציפיות
- השתמש באימוג'ים במידה (2-3 בסיכום)`;

/**
 * Build user prompt for monthly summary
 */
function buildMonthlySummaryPrompt(monthlyData, previousMonthData) {
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

module.exports = {
    monthlySummarySystemPrompt,
    buildMonthlySummaryPrompt
};
