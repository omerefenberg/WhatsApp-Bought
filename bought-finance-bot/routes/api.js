const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const { getCategoryStats, getMonthlyStats, getDailyStats, getWeeklyStats } = require('../utils/stats');

/**
 * GET /api/transactions
 * Get all transactions
 */
router.get('/transactions', async (req, res) => {
    try {
        const { limit = 50, skip = 0, type, category } = req.query;

        const filter = {};
        if (type) filter.type = type;
        if (category) filter.category = category;

        const transactions = await Transaction.find(filter)
            .sort({ date: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await Transaction.countDocuments(filter);

        res.json({
            success: true,
            data: transactions,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליפת נתונים'
        });
    }
});

/**
 * GET /api/transactions/:id
 * Get single transaction
 */
router.get('/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'טרנזקציה לא נמצאה'
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('❌ Error fetching transaction:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליפת נתונים'
        });
    }
});

/**
 * POST /api/transactions
 * Create new transaction
 */
router.post('/transactions', async (req, res) => {
    try {
        const transaction = await Transaction.create({
            ...req.body,
            source: 'api'
        });

        res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('❌ Error creating transaction:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'נתונים לא תקינים',
                details: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'שגיאה ביצירת טרנזקציה'
        });
    }
});

/**
 * PUT /api/transactions/:id
 * Update transaction
 */
router.put('/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'טרנזקציה לא נמצאה'
            });
        }

        res.json({
            success: true,
            data: transaction
        });
    } catch (error) {
        console.error('❌ Error updating transaction:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'נתונים לא תקינים',
                details: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'שגיאה בעדכון טרנזקציה'
        });
    }
});

/**
 * DELETE /api/transactions/:id
 * Delete transaction
 */
router.delete('/transactions/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'טרנזקציה לא נמצאה'
            });
        }

        res.json({
            success: true,
            message: 'טרנזקציה נמחקה בהצלחה'
        });
    } catch (error) {
        console.error('❌ Error deleting transaction:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה במחיקת טרנזקציה'
        });
    }
});

/**
 * GET /api/stats/monthly
 * Monthly statistics
 */
router.get('/stats/monthly', async (req, res) => {
    try {
        const stats = await getMonthlyStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error in monthly statistics:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בחישוב סטטיסטיקות'
        });
    }
});

/**
 * GET /api/stats/daily
 * Daily statistics
 */
router.get('/stats/daily', async (req, res) => {
    try {
        const stats = await getDailyStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error in daily statistics:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בחישוב סטטיסטיקות'
        });
    }
});

/**
 * GET /api/stats/weekly
 * Weekly statistics
 */
router.get('/stats/weekly', async (req, res) => {
    try {
        const stats = await getWeeklyStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error in weekly statistics:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בחישוב סטטיסטיקות'
        });
    }
});

/**
 * GET /api/stats/categories
 * Category statistics
 */
router.get('/stats/categories', async (req, res) => {
    try {
        const stats = await getCategoryStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error in category statistics:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בחישוב סטטיסטיקות'
        });
    }
});

/**
 * GET /api/health
 * Health check
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/budget
 * Get budget
 */
router.get('/budget', async (req, res) => {
    try {
        const { userId } = req.query;

        let budget;
        if (userId) {
            budget = await Budget.findOne({ userId });
        } else {
            budget = await Budget.findOne({ setupCompleted: true });
        }

        if (!budget) {
            return res.json({
                success: true,
                data: null,
                message: 'לא נמצא תקציב'
            });
        }

        res.json({
            success: true,
            data: budget
        });
    } catch (error) {
        console.error('❌ Error fetching budget:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליפת תקציב'
        });
    }
});

/**
 * GET /api/budget/compare
 * Compare budget to actual expenses
 */
router.get('/budget/compare', async (req, res) => {
    try {
        const budget = await Budget.findOne({ setupCompleted: true });

        if (!budget) {
            return res.json({
                success: true,
                data: null,
                message: 'לא נמצא תקציב'
            });
        }

        const categoryStats = await getCategoryStats();

        const comparison = Object.keys(budget.categories).map(category => {
            const budgetAmount = budget.categories[category];
            const spent = categoryStats.find(s => s.name === category)?.value || 0;
            const remaining = budgetAmount - spent;
            const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
            const isOverBudget = spent > budgetAmount;

            return {
                category,
                budget: budgetAmount,
                spent,
                remaining,
                percentage,
                isOverBudget
            };
        });

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('❌ Error comparing budget:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהשוואת תקציב'
        });
    }
});

/**
 * GET /api/goals
 * Get all savings goals
 */
router.get('/goals', async (req, res) => {
    try {
        const { userId, status } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId הוא שדה חובה'
            });
        }

        const filter = { userId };
        if (status) filter.status = status;

        const goals = await Goal.find(filter).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: goals,
            count: goals.length
        });
    } catch (error) {
        console.error('❌ Error fetching goals:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליפת יעדים'
        });
    }
});

/**
 * GET /api/goals/:id
 * Get single goal
 */
router.get('/goals/:id', async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'יעד לא נמצא'
            });
        }

        // Also return progress summary
        const summary = goal.getProgressSummary();

        res.json({
            success: true,
            data: {
                ...goal.toObject(),
                summary
            }
        });
    } catch (error) {
        console.error('❌ Error fetching goal:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליפת יעד'
        });
    }
});

/**
 * POST /api/goals
 * יצירת יעד חדש
 */
router.post('/goals', async (req, res) => {
    try {
        const { userId, title, description, targetAmount, deadline, category } = req.body;

        if (!userId || !title || !targetAmount) {
            return res.status(400).json({
                success: false,
                error: 'userId, title ו-targetAmount הם שדות חובה'
            });
        }

        const goal = await Goal.create({
            userId,
            title,
            description,
            targetAmount,
            deadline: deadline ? new Date(deadline) : undefined,
            category
        });

        res.status(201).json({
            success: true,
            data: goal
        });
    } catch (error) {
        console.error('❌ שגיאה ביצירת יעד:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'נתונים לא תקינים',
                details: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'שגיאה ביצירת יעד'
        });
    }
});

/**
 * PUT /api/goals/:id
 * עדכון יעד
 */
router.put('/goals/:id', async (req, res) => {
    try {
        const { title, description, targetAmount, deadline, category, status } = req.body;

        const goal = await Goal.findByIdAndUpdate(
            req.params.id,
            {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(targetAmount && { targetAmount }),
                ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
                ...(category && { category }),
                ...(status && { status })
            },
            { new: true, runValidators: true }
        );

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'יעד לא נמצא'
            });
        }

        res.json({
            success: true,
            data: goal
        });
    } catch (error) {
        console.error('❌ שגיאה בעדכון יעד:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: 'נתונים לא תקינים',
                details: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'שגיאה בעדכון יעד'
        });
    }
});

/**
 * DELETE /api/goals/:id
 * מחיקת יעד
 */
router.delete('/goals/:id', async (req, res) => {
    try {
        const goal = await Goal.findByIdAndDelete(req.params.id);

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'יעד לא נמצא'
            });
        }

        res.json({
            success: true,
            message: 'יעד נמחק בהצלחה'
        });
    } catch (error) {
        console.error('❌ שגיאה במחיקת יעד:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה במחיקת יעד'
        });
    }
});

/**
 * POST /api/goals/:id/progress
 * הוספת התקדמות ליעד
 */
router.post('/goals/:id/progress', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'סכום ההתקדמות חייב להיות חיובי'
            });
        }

        const goal = await Goal.findById(req.params.id);

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'יעד לא נמצא'
            });
        }

        await goal.addProgress(amount);
        const summary = goal.getProgressSummary();

        res.json({
            success: true,
            data: {
                ...goal.toObject(),
                summary
            },
            message: summary.isCompleted ? '🎉 יעד הושלם!' : 'התקדמות נוספה בהצלחה'
        });
    } catch (error) {
        console.error('❌ שגיאה בהוספת התקדמות:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהוספת התקדמות'
        });
    }
});

/**
 * GET /api/goals/:id/summary
 * קבלת סיכום התקדמות יעד
 */
router.get('/goals/:id/summary', async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);

        if (!goal) {
            return res.status(404).json({
                success: false,
                error: 'יעד לא נמצא'
            });
        }

        const summary = goal.getProgressSummary();

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('❌ שגיאה בשליפת סיכום:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בשליפת סיכום'
        });
    }
});

module.exports = router;