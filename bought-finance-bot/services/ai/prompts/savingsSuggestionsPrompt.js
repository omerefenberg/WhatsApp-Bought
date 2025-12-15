/**
 * Prompts for generating personalized savings suggestions
 */
const savingsSuggestionsSystemPrompt = "אתה יועץ חיסכון. תן עצות מעשיות ומעודדות בעברית.";

/**
 * Build user prompt for savings suggestions
 */
function buildSavingsSuggestionsPrompt(frequentExpenses) {
    let prompt = `נתח הוצאות חוזרות והמלץ על דרך אחת לחיסכון:

${frequentExpenses.map(f =>
        `- ${f.description}: ${f.count} פעמים בחודש, סה"כ ${f.total}₪ (ממוצע ${f.average}₪ לפעם)`
    ).join('\n')}

תן המלצה אחת ספציפית:
1. התמקד בהוצאה החוזרת הכי יקרה
2. הצע אלטרנטיבה מעשית לחיסכון
3. חשב כמה ניתן לחסוך בחודש/שנה
4. היה מעודד, לא מטיף

פורמט: 2-3 משפטים קצרים.`;

    return prompt;
}

module.exports = {
    savingsSuggestionsSystemPrompt,
    buildSavingsSuggestionsPrompt
};
