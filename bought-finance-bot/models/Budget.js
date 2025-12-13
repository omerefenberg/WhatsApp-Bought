const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    categories: {
        אוכל: { type: Number, default: 0 },
        תחבורה: { type: Number, default: 0 },
        קניות: { type: Number, default: 0 },
        חשבונות: { type: Number, default: 0 },
        בילויים: { type: Number, default: 0 },
        בריאות: { type: Number, default: 0 },
        כללי: { type: Number, default: 0 }
    },
    setupCompleted: {
        type: Boolean,
        default: false
    },
    setupStep: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

budgetSchema.methods.isSetupComplete = function() {
    return this.setupCompleted;
};

budgetSchema.methods.getBudgetForCategory = function(category) {
    return this.categories[category] || 0;
};

module.exports = mongoose.model('Budget', budgetSchema);