const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'userId הוא שדה חובה'],
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
        min: [0, 'הסכום חייב להיות חיובי']
    },
    type: { 
        type: String, 
        enum: {
            values: ['income', 'expense'],
            message: 'הסוג חייב להיות income או expense'
        },
        required: true,
        default: 'expense'
    },
    category: { 
        type: String, 
        enum: {
            values: ['אוכל', 'תחבורה', 'קניות', 'חשבונות', 'בילויים', 'משכורת', 'בריאות', 'כללי'],
            message: 'קטגוריה לא חוקית'
        },
        default: 'כללי',
        required: true
    },
    description: { 
        type: String,
        required: [true, 'תיאור הוא שדה חובה'],
        trim: true,
        maxlength: [200, 'התיאור ארוך מדי']
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