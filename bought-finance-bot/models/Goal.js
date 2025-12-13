const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'userId הוא שדה חובה'],
        index: true
    },
    title: {
        type: String,
        required: [true, 'כותרת היעד היא שדה חובה'],
        trim: true,
        maxlength: [100, 'כותרת היעד ארוכה מדי']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'התיאור ארוך מדי']
    },
    targetAmount: {
        type: Number,
        required: [true, 'סכום היעד הוא שדה חובה'],
        min: [1, 'סכום היעד חייב להיות חיובי']
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: [0, 'הסכום הנוכחי לא יכול להיות שלילי']
    },
    deadline: {
        type: Date,
        required: false
    },
    category: {
        type: String,
        enum: ['טיול', 'רכישה', 'חירום', 'השקעה', 'כללי'],
        default: 'כללי'
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        required: false
    },
    // חישובים אוטומטיים
    weeklyTarget: {
        type: Number,
        default: 0
    },
    monthlyTarget: {
        type: Number,
        default: 0
    },
    progressPercentage: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// אינדקסים למהירות
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, createdAt: -1 });

// חישוב אוטומטי של מטרות שבועיות/חודשיות
goalSchema.pre('save', function(next) {
    // חישוב אחוז התקדמות
    if (this.targetAmount > 0) {
        this.progressPercentage = Math.round((this.currentAmount / this.targetAmount) * 100);
    }

    // אם יש תאריך יעד, חשב מטרות שבועיות/חודשיות
    if (this.deadline && this.status === 'active') {
        const now = new Date();
        const daysRemaining = Math.ceil((this.deadline - now) / (1000 * 60 * 60 * 24));
        const weeksRemaining = Math.ceil(daysRemaining / 7);
        const monthsRemaining = Math.ceil(daysRemaining / 30);

        const remaining = this.targetAmount - this.currentAmount;

        if (weeksRemaining > 0) {
            this.weeklyTarget = Math.ceil(remaining / weeksRemaining);
        }

        if (monthsRemaining > 0) {
            this.monthlyTarget = Math.ceil(remaining / monthsRemaining);
        }
    }

    // אם הגענו ליעד, סמן כהושלם
    if (this.currentAmount >= this.targetAmount && this.status === 'active') {
        this.status = 'completed';
        this.completedAt = new Date();
    }

    next();
});

// מתודות עזר
goalSchema.methods.addProgress = async function(amount) {
    this.currentAmount += amount;
    await this.save();
    return this;
};

goalSchema.methods.getTimeRemaining = function() {
    if (!this.deadline) return null;

    const now = new Date();
    const diff = this.deadline - now;

    if (diff < 0) return { expired: true };

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(days / 7);
    const months = Math.ceil(days / 30);

    return {
        days,
        weeks,
        months,
        expired: false
    };
};

goalSchema.methods.getProgressSummary = function() {
    const remaining = this.targetAmount - this.currentAmount;
    const time = this.getTimeRemaining();

    return {
        current: this.currentAmount,
        target: this.targetAmount,
        remaining: remaining > 0 ? remaining : 0,
        percentage: this.progressPercentage,
        weeklyTarget: this.weeklyTarget,
        monthlyTarget: this.monthlyTarget,
        timeRemaining: time,
        isCompleted: this.status === 'completed'
    };
};

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;
