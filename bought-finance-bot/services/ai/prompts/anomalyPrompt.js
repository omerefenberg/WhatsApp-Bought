/**
 * Prompts for detecting anomalies in expenses
 */
const anomalySystemPrompt = "אתה מערכת התראות פיננסיות. תן התראות ברורות ומועילות בעברית.";

/**
 * Build user prompt for anomaly detection
 */
function buildAnomalyPrompt(anomalies) {
    let prompt = `זוהו חריגות בהוצאות החודש. צור הודעת התראה קצרה (2-3 משפטים):

${anomalies.map(a =>
        `- ${a.category}: ${a.current}₪ (${a.deviation >= 0 ? '+' : ''}${a.deviation}% מהממוצע של ${a.average}₪)`
    ).join('\n')}

ההודעה צריכה:
1. להצביע על החריגה הכי משמעותית
2. להיות אובייקטיבית (לא לשפוט)
3. לשאול האם זה מכוון או בטעות`;

    return prompt;
}

module.exports = {
    anomalySystemPrompt,
    buildAnomalyPrompt
};
