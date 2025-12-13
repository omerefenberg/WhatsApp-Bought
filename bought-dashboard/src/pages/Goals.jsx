import React, { useState, useEffect, useCallback } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { goalsService } from '../services/goalsService';

const Goals = ({ userId, darkMode, onBack }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await goalsService.getAllGoals(userId, 'active');
      setGoals(response.data);
    } catch (err) {
      console.error('Error loading goals:', err);
      setError('שגיאה בטעינת יעדים. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>טוען יעדים...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
        >
          <ArrowRight className="w-5 h-5" />
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`} dir="rtl" style={{ fontFamily: "'Open Sans', sans-serif", paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-5 pt-6 pb-5 transition-colors`}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowRight className="w-5 h-5" />
            חזרה
          </button>
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🎯 יעדי חיסכון
          </h1>
        </div>
      </div>

      <div className="px-5 py-6">
        {goals.length === 0 ? (
          <div className="text-center text-gray-500 mt-12">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">אין יעדים פעילים</p>
            <p className="text-sm">צור יעד חדש בWhatsApp באמצעות הפקודה /יעד</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <GoalCard key={goal._id} goal={goal} darkMode={darkMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const GoalCard = ({ goal, darkMode }) => {
  const {
    title,
    description,
    targetAmount,
    currentAmount,
    progressPercentage,
    category,
    deadline
  } = goal;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL').format(Math.round(amount));
  };

  const getCategoryColor = (category) => {
    const colors = {
      'טיול': '#3B82F6',
      'רכישה': '#8B5CF6',
      'חירום': '#EF4444',
      'השקעה': '#10B981',
      'כללי': '#6B7280'
    };
    return colors[category] || '#6366F1';
  };

  const color = getCategoryColor(category);

  return (
    <div
      className={`rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all border-r-4 ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}
      style={{ borderColor: color }}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className={`text-xl font-bold text-right mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        {description && (
          <p className={`text-sm text-right ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        )}
        <span
          className="inline-block text-white text-xs px-3 py-1 rounded-full mt-2 font-medium"
          style={{ backgroundColor: color }}
        >
          {category}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className={`w-full rounded-full h-6 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-6 rounded-full transition-all duration-500 flex items-center justify-center relative overflow-hidden"
            style={{
              width: `${Math.min(progressPercentage, 100)}%`,
              background: `linear-gradient(90deg, ${color}dd, ${color})`
            }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            {progressPercentage > 10 && (
              <span className="text-white text-xs font-bold relative z-10">
                {progressPercentage}%
              </span>
            )}
          </div>
        </div>
        {progressPercentage <= 10 && (
          <p className={`text-center mt-1 text-sm font-bold ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
            {progressPercentage}%
          </p>
        )}
      </div>

      {/* Amounts */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-right">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>יעד</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            ₪{formatCurrency(targetAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>נחסך</p>
          <p className="text-lg font-bold" style={{ color }}>
            ₪{formatCurrency(currentAmount)}
          </p>
        </div>
      </div>

      {/* Remaining amount */}
      <div
        className={`rounded-2xl p-3 mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
      >
        <p className={`text-sm text-right ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          נותר לחסוך:
        </p>
        <p className="text-lg font-bold text-right text-orange-600">
          ₪{formatCurrency(targetAmount - currentAmount)}
        </p>
      </div>

      {/* Deadline */}
      {deadline && (
        <div className={`text-xs text-right flex items-center justify-end gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span>
            {new Date(deadline).toLocaleDateString('he-IL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
          <span>📅 יעד:</span>
        </div>
      )}
    </div>
  );
};

export default Goals;
