const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'userId is required'],
        index: true
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount must be positive']
    },
    type: {
        type: String,
        enum: {
            values: ['income', 'expense'],
            message: 'Type must be income or expense'
        },
        required: true,
        default: 'expense'
    },
    category: {
        type: String,
        enum: {
            values: ['אוכל', 'תחבורה', 'קניות', 'חשבונות', 'בילויים', 'משכורת', 'בריאות', 'כללי'],
            message: 'Invalid category'
        },
        default: 'כללי',
        required: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [200, 'Description is too long']
    },
    source: {
        type: String,
        enum: ['whatsapp', 'whatsapp-receipt', 'api', 'manual'],
        default: 'whatsapp'
    }
}, {
    timestamps: true
});

transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });

transactionSchema.methods.toWhatsAppString = function() {
    const emoji = this.type === 'income' ? '💰' : '💸';
    return `${emoji} ${this.description} (${this.category}) - ${this.amount}₪`;
};

module.exports = mongoose.model('Transaction', transactionSchema);