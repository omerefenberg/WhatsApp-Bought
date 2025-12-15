const Transaction = require('../models/Transaction');

function calculateStats(transactions) {
    let totalExpense = 0;
    let totalIncome = 0;

    transactions.forEach(t => {
        if (t.type === 'expense') totalExpense += t.amount;
        if (t.type === 'income') totalIncome += t.amount;
    });

    return { 
        expense: totalExpense, 
        income: totalIncome, 
        balance: totalIncome - totalExpense,
        count: transactions.length
    };
}

async function getMonthlyStats(userId = null) {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const query = { date: { $gte: startOfMonth } };
        if (userId) {
            query.userId = userId;
        }

        const transactions = await Transaction.find(query);

        return calculateStats(transactions);
    } catch (error) {
        console.error('❌ Error calculating monthly stats:', error);
        throw error;
    }
}

async function getDailyStats(userId = null) {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const query = { date: { $gte: startOfDay, $lte: endOfDay } };
        if (userId) {
            query.userId = userId;
        }

        const transactions = await Transaction.find(query);

        return calculateStats(transactions);
    } catch (error) {
        console.error('❌ Error calculating daily stats:', error);
        throw error;
    }
}

async function getWeeklyStats(userId = null) {
    try {
        const startOfWeek = new Date();
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const query = { date: { $gte: startOfWeek } };
        if (userId) {
            query.userId = userId;
        }

        const transactions = await Transaction.find(query);

        return calculateStats(transactions);
    } catch (error) {
        console.error('❌ Error calculating weekly stats:', error);
        throw error;
    }
}

async function getCategoryStats(userId = null) {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const matchQuery = {
            type: 'expense',
            date: { $gte: startOfMonth }
        };

        if (userId) {
            matchQuery.userId = userId;
        }

        const stats = await Transaction.aggregate([
            {
                $match: matchQuery
            },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { total: -1 }
            }
        ]);

        return stats.map(s => ({
            name: s._id,
            value: s.total,
            count: s.count
        }));
    } catch (error) {
        console.error('❌ Error calculating category stats:', error);
        throw error;
    }
}

function formatStatsMessage(stats, period = 'חודש') {
    const emoji = stats.balance >= 0 ? '🟢' : '🔴';

    return `📊 *מצב ${period}:*\n\n` +
           `💰 הכנסות: ${stats.income.toLocaleString()}₪\n` +
           `💸 הוצאות: ${stats.expense.toLocaleString()}₪\n` +
           `📝 טרנזקציות: ${stats.count}\n` +
           `─────────────────\n` +
           `${emoji} *יתרה: ${stats.balance.toLocaleString()}₪*`;
}

/**
 * Calculate detailed monthly summary with budget comparison
 */
async function getMonthlyBudgetComparison(userId) {
    try {
        const Budget = require('../models/Budget');

        // Get user budget
        const budget = await Budget.findOne({ userId, setupCompleted: true });
        if (!budget) {
            return null;
        }

        // Calculate start of month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Get all expenses for the month
        const expenses = await Transaction.find({
            userId,
            type: 'expense',
            date: { $gte: startOfMonth }
        });

        // Calculate expenses by category
        const categoryTotals = {};
        expenses.forEach(expense => {
            if (!categoryTotals[expense.category]) {
                categoryTotals[expense.category] = 0;
            }
            categoryTotals[expense.category] += expense.amount;
        });

        // Build comparison data
        const categories = ['אוכל', 'תחבורה', 'קניות', 'חשבונות', 'בילויים', 'בריאות', 'כללי'];
        const comparison = [];
        let totalBudget = 0;
        let totalSpent = 0;

        categories.forEach(category => {
            const budgetAmount = budget.categories[category] || 0;
            const spent = categoryTotals[category] || 0;
            const remaining = budgetAmount - spent;
            const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

            totalBudget += budgetAmount;
            totalSpent += spent;

            if (budgetAmount > 0) {
                comparison.push({
                    category,
                    budget: budgetAmount,
                    spent,
                    remaining,
                    percentage,
                    overBudget: spent > budgetAmount
                });
            }
        });

        const totalSaved = totalBudget - totalSpent;
        const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

        return {
            comparison,
            totalBudget,
            totalSpent,
            totalSaved,
            overallPercentage,
            savedMoney: totalSaved > 0
        };
    } catch (error) {
        console.error('❌ Error calculating budget comparison:', error);
        throw error;
    }
}

module.exports = {
    calculateStats,
    getMonthlyStats,
    getDailyStats,
    getWeeklyStats,
    getCategoryStats,
    formatStatsMessage,
    getMonthlyBudgetComparison
};