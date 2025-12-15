const OpenAI = require('openai');
const { transactionSystemPrompt } = require('./prompts/transactionPrompt');
const { receiptSystemPrompt, receiptUserPrompt } = require('./prompts/receiptPrompt');
const { monthlySummarySystemPrompt, buildMonthlySummaryPrompt } = require('./prompts/monthlySummaryPrompt');
const { anomalySystemPrompt, buildAnomalyPrompt } = require('./prompts/anomalyPrompt');
const { savingsGoalSystemPrompt } = require('./prompts/savingsGoalPrompt');
const { savingsSuggestionsSystemPrompt, buildSavingsSuggestionsPrompt } = require('./prompts/savingsSuggestionsPrompt');

class AIService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required');
        }
        this.openai = new OpenAI({ apiKey });
    }

    /**
     * Parse message and extract transaction
     */
    async parseTransaction(messageText) {
        try {
            console.log(`🧠 Parsing message: "${messageText}"`);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: transactionSystemPrompt
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

            // Validation
            if (!data.type || data.type === null) {
                console.log("🤷‍♂️ No financial information found in message");
                return null;
            }

            // Additional validation
            if (!this.isValidTransaction(data)) {
                console.log("⚠️ Invalid data from AI");
                return null;
            }

            console.log(`✅ Detected: ${data.description} - ${data.amount}₪`);
            return data;

        } catch (error) {
            console.error("❌ Error in AI parsing:", error.message);

            // Handle specific OpenAI errors
            if (error.code === 'insufficient_quota') {
                console.error("💰 Insufficient credit in OpenAI API");
                throw new Error('שגיאת מכסה - אנא בדוק את חשבון OpenAI');
            }

            if (error.code === 'invalid_api_key') {
                console.error("🔑 Invalid API key");
                throw new Error('מפתח API לא חוקי');
            }

            if (error.status === 429) {
                console.error("⏱️ Too many requests to OpenAI");
                throw new Error('יותר מדי בקשות, נסה שוב בעוד כמה שניות');
            }

            if (error.status >= 500) {
                console.error("🔧 OpenAI server error");
                throw new Error('שגיאת שרת OpenAI, נסה שוב מאוחר יותר');
            }

            if (error instanceof SyntaxError) {
                console.error("📝 Invalid AI response - cannot parse JSON");
                return null;
            }

            throw error;
        }
    }

    /**
     * Validate transaction
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
     * Parse receipt from image with Vision API
     */
    async parseReceipt(imageBase64) {
        try {
            console.log('📸 Parsing receipt from image with GPT-4o Vision...');
            console.log(`📏 Image size: ${imageBase64.length} base64 characters`);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: receiptSystemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: receiptUserPrompt
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
            console.log('📨 Response from GPT-4o:', content ? content.substring(0, 200) : 'null');

            if (!content) {
                console.log("⚠️ AI did not return content - image might not be clear or does not contain a receipt");
                return null;
            }

            const cleanJson = content.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            console.log('📋 Parsed data:', JSON.stringify(data, null, 2));

            // Validation
            if (!data.type || data.type === null) {
                console.log("🤷‍♂️ No financial information found in image");
                return null;
            }

            if (!this.isValidTransaction(data)) {
                console.log("⚠️ Invalid data from receipt");
                console.log("   Reason: amount=" + data.amount + ", description=" + data.description + ", category=" + data.category + ", type=" + data.type);
                return null;
            }

            console.log(`✅ Detected from receipt: ${data.description} - ${data.amount}₪`);
            return data;

        } catch (error) {
            console.error("❌ Error parsing receipt:", error.message);

            // Handle specific errors
            if (error.code === 'insufficient_quota') {
                console.error("💰 Insufficient credit in OpenAI API");
                throw new Error('שגיאת מכסה - אנא בדוק את חשבון OpenAI');
            }

            if (error.status === 429) {
                console.error("⏱️ Too many requests to OpenAI");
                throw new Error('יותר מדי בקשות, נסה שוב בעוד כמה שניות');
            }

            if (error instanceof SyntaxError) {
                console.error("📝 Invalid AI response - cannot parse JSON");
                return null;
            }

            throw error;
        }
    }

    /**
     * Generate monthly summary in natural language with AI insights
     */
    async generateMonthlySummaryWithInsights(userId, monthlyData, previousMonthData = null) {
        try {
            console.log(`🧠 Generating smart monthly summary for user ${userId}`);

            // Build prompt using external function
            const prompt = buildMonthlySummaryPrompt(monthlyData, previousMonthData);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: monthlySummarySystemPrompt
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
            console.log(`✅ Monthly summary created successfully`);
            return summary;

        } catch (error) {
            console.error('❌ Error creating monthly summary:', error.message);
            return null;
        }
    }

    /**
     * Detect anomalies in expenses
     */
    async detectAnomalies(userId, currentExpenses, historicalExpenses) {
        try {
            console.log(`🔍 Looking for anomalies in expenses for user ${userId}`);

            // Calculate historical average for each category
            const categoryAverages = this.calculateCategoryAverages(historicalExpenses);
            const anomalies = [];

            // Check each category
            for (const [category, currentAmount] of Object.entries(currentExpenses)) {
                const average = categoryAverages[category] || 0;

                if (average > 0) {
                    const deviation = ((currentAmount - average) / average) * 100;

                    // Anomaly if deviation is more than 50%
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

            // Create personalized message with AI using external prompt builder
            const prompt = buildAnomalyPrompt(anomalies);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: anomalySystemPrompt },
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
            console.error('❌ Error detecting anomalies:', error.message);
            return null;
        }
    }

    /**
     * Calculate historical average by category
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
     * Personalized savings recommendations
     */
    async generateSavingsSuggestions(userId, expenses, budget) {
        try {
            console.log(`💡 Generating savings recommendations for user ${userId}`);

            // Find categories with most recurring expenses
            const frequentExpenses = this.analyzeFrequentExpenses(expenses);

            if (frequentExpenses.length === 0) {
                return null;
            }

            // Build prompt using external function
            const prompt = buildSavingsSuggestionsPrompt(frequentExpenses);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: savingsSuggestionsSystemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 200
            });

            return response.choices[0].message.content.trim();

        } catch (error) {
            console.error('❌ Error generating savings recommendations:', error.message);
            return null;
        }
    }

    /**
     * Analyze recurring expenses
     */
    analyzeFrequentExpenses(expenses) {
        const descriptionMap = {};

        expenses.forEach(exp => {
            // Normalize similar descriptions (e.g., "coffee", "latte" -> "coffee")
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

        // Sort by total amount
        return Object.values(descriptionMap)
            .filter(item => item.count >= 3) // Only things that happened 3+ times
            .map(item => ({
                ...item,
                average: Math.round(item.total / item.count)
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 3); // Top 3
    }

    /**
     * Smart parser to create savings goal from free text
     */
    async parseGoalFromText(text) {
        try {
            console.log(`🎯 Parsing goal from text: "${text}"`);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: savingsGoalSystemPrompt
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

            // Validation
            if (!data || !data.title || !data.targetAmount || data.targetAmount <= 0) {
                console.log('⚠️ Cannot detect valid goal');
                return null;
            }

            // Convert date to Date object if exists
            if (data.deadline) {
                try {
                    data.deadline = new Date(data.deadline);
                    // Check that date is in the future
                    if (data.deadline <= new Date()) {
                        console.log('⚠️ Goal date must be in the future');
                        data.deadline = null;
                    }
                } catch (e) {
                    console.log('⚠️ Invalid date, ignoring');
                    data.deadline = null;
                }
            }

            console.log(`✅ Goal detected: ${data.title} - ${data.targetAmount}₪`);
            return data;

        } catch (error) {
            console.error('❌ Error parsing goal:', error.message);

            if (error instanceof SyntaxError) {
                console.error('📝 Invalid AI response - cannot parse JSON');
                return null;
            }

            return null;
        }
    }
}

module.exports = AIService;
