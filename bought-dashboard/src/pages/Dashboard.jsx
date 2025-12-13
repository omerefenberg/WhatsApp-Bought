import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, ShoppingCart, Car, Zap, Coffee, Heart, Package, Gift, ArrowUp, ArrowDown, Target, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { goalsService } from '../services/goalsService';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

const categoryIcons = {
  'אוכל': Coffee,
  'תחבורה': Car,
  'קניות': ShoppingCart,
  'חשבונות': Zap,
  'בילויים': Gift,
  'בריאות': Heart,
  'כללי': Package
};

const categoryColors = {
  'אוכל': '#E67E22',
  'תחבורה': '#3498DB',
  'קניות': '#9B59B6',
  'חשבונות': '#F39C12',
  'בילויים': '#E74C3C',
  'בריאות': '#1ABC9C',
  'כללי': '#34495E'
};

function Dashboard({ darkMode, setDarkMode }) {
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [budgetComparison, setBudgetComparison] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // TODO: Replace with actual userId from authentication
  const userId = '232039970275414@lid';

  const loadGoals = useCallback(async () => {
    try {
      const response = await goalsService.getAllGoals(userId, 'active');
      setGoals(response.data);
    } catch (err) {
      console.error('Error loading goals:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    loadGoals();
    const interval = setInterval(() => {
      fetchData();
      loadGoals();
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadGoals]);

  const fetchData = async () => {
    try {
      const [monthlyRes, categoryRes, budgetRes] = await Promise.all([
        fetch(`${API_URL}/stats/monthly?userId=${userId}`),
        fetch(`${API_URL}/stats/categories?userId=${userId}`),
        fetch(`${API_URL}/budget/compare?userId=${userId}`)
      ]);

      const monthlyData = await monthlyRes.json();
      const categoryData = await categoryRes.json();
      const budgetData = await budgetRes.json();

      setMonthlyStats(monthlyData.data);
      setCategoryStats(categoryData.data);
      setBudgetComparison(budgetData.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), loadGoals()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL').format(Math.round(amount));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>טוען...</div>
      </div>
    );
  }

  const balance = monthlyStats?.balance || 0;
  const income = monthlyStats?.income || 0;
  const expense = monthlyStats?.expense || 0;

  const top5 = [...categoryStats].sort((a, b) => b.value - a.value).slice(0, 5);

  const pieChartData = categoryStats.map(item => ({
    name: item.name,
    value: item.value,
    color: categoryColors[item.name] || '#6366F1'
  }));

  return (
    <div
      className="min-h-screen transition-colors relative overflow-hidden"
      dir="rtl"
      style={{
        fontFamily: "'Open Sans', sans-serif",
        background: darkMode
          ? 'linear-gradient(135deg, #051029 0%, #0a255c 50%, #1d4e9e 100%)'
          : 'linear-gradient(to bottom right, #f8fafc 0%, #dbeafe 50%, #a5f3fc 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Liquid Glass Blobs */}
      <div className={darkMode ? "glass-blob blob-1" : "glass-blob-light blob-1-light"}></div>
      <div className={darkMode ? "glass-blob blob-2" : "glass-blob-light blob-2-light"}></div>
      <div className={darkMode ? "glass-blob blob-3" : "glass-blob-light blob-3-light"}></div>
      <div className={darkMode ? "glass-blob blob-4" : "glass-blob-light blob-4-light"}></div>

      {/* Content Wrapper */}
      <div className="relative z-10">
      {/* Dark Gradient Overlay at Top - Only in dark mode */}
      {darkMode && (
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-black/50 via-black/20 to-transparent pointer-events-none z-0"></div>
      )}

      {/* Header */}
      <div className="px-5 pt-6 pb-5 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>WhatsApp Bought</div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50"
              title="רענן נתונים"
            >
              <RefreshCw className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-slate-700'} ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Total Balance Card - Advanced Frosted Glass */}
        <div className="relative rounded-3xl p-6 overflow-hidden glass-effect">
          {/* Decorative light effects */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -ml-20 -mt-20"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mb-16"></div>

          <div className="relative">
            <div className={`text-sm mb-2 ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>סך המאזן</div>
            <div className={`text-4xl font-medium mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              ₪{formatCurrency(Math.abs(balance))}
            </div>
            <div className={`absolute bottom-0 left-0 glass-effect rounded-full px-4 py-2 flex items-center gap-2 text-sm font-medium pointer-events-none ${darkMode ? 'text-white' : 'text-slate-700'}`}>
              היתרות שלי
              <ArrowDown className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5 mt-5">
        {/* Income/Expenses Card - Advanced Frosted Glass */}
        <div className="relative rounded-3xl p-5 overflow-hidden glass-effect">
          {/* Decorative light effects */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/20 rounded-full blur-3xl -ml-14 -mb-14"></div>

          <div className="relative flex items-center justify-around">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
                <ArrowUp className={`w-6 h-6 ${darkMode ? 'text-green-300' : 'text-green-600'}`} strokeWidth={3} />
              </div>
              <div>
                <div className={`text-sm ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>הכנסות</div>
                <div className={`text-2xl font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>₪{formatCurrency(income)}</div>
              </div>
            </div>
            <div className={`w-px h-16 ${darkMode ? 'bg-white/20' : 'bg-slate-300'}`}></div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
                <ArrowDown className={`w-6 h-6 ${darkMode ? 'text-red-300' : 'text-red-600'}`} strokeWidth={3} />
              </div>
              <div>
                <div className={`text-sm ${darkMode ? 'text-white/80' : 'text-slate-600'}`}>הוצאות</div>
                <div className={`text-2xl font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>₪{formatCurrency(expense)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 5 Expenses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>5 ההוצאות המובילות</h2>
            <div className={`glass-effect px-4 py-2 rounded-full text-sm font-medium pointer-events-none ${darkMode ? 'text-white' : 'text-slate-700'}`}>
              השבוע
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {top5.map((cat, idx) => {
              const Icon = categoryIcons[cat.name] || Package;

              return (
                <div
                  key={idx}
                  className="min-w-[150px] rounded-3xl p-4 relative glass-effect overflow-hidden"
                >
                  {/* Light effect */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-2xl"></div>

                  {/* Ranking number - top right with spacing */}
                  <div className={`absolute top-3 right-3 w-8 h-8 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-base font-medium border border-white/30 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {idx + 1}
                  </div>

                  {/* Icon - top left with spacing, no background */}
                  <div className="absolute top-3 left-3">
                    <Icon className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-slate-700'}`} />
                  </div>

                  {/* Content */}
                  <div className="mt-14">
                    <div className={`text-base font-medium mb-1 ${darkMode ? 'text-white' : 'text-slate-700'}`}>{cat.name}</div>
                    <div className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>₪{formatCurrency(cat.value)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>יעדי חיסכון</h2>
          </div>

          {goals.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? 'text-white/70' : 'text-slate-500'}`}>
              <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>אין יעדים פעילים</p>
              <p className="text-sm mt-1">צור יעד חדש בWhatsApp באמצעות הפקודה /יעד</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => (
                <GoalCard key={goal._id} goal={goal} darkMode={darkMode} />
              ))}
            </div>
          )}
        </div>

        {/* Spend vs Budget */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>הוצאות מול תקציב</h2>
            <div className={`glass-effect px-4 py-2 rounded-full text-sm font-medium pointer-events-none ${darkMode ? 'text-white' : 'text-slate-700'}`}>
              החודש
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {budgetComparison.map((item, idx) => {
              const percentage = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
              const Icon = categoryIcons[item.category] || Package;

              return (
                <div
                  key={idx}
                  className="rounded-3xl p-4 glass-effect"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30">
                      <Icon className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-slate-700'}`} />
                    </div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{item.category}</div>
                  </div>
                  <div className={`text-2xl font-medium mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ₪{formatCurrency(item.spent)}
                  </div>
                  <div className={`text-sm mb-3 ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
                    נותרו ₪{formatCurrency(Math.max(item.remaining, 0))}
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-white/20' : 'bg-slate-200'}`}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: item.isOverBudget ? '#EF4444' : '#10B981'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="rounded-3xl p-6 glass-effect">
          <h2 className={`text-xl font-medium mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            התפלגות הוצאות
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    className="drop-shadow-lg"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: darkMode ? '#1F2937' : 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  color: darkMode ? 'white' : '#1e293b'
                }}
                formatter={(value) => `₪${formatCurrency(value)}`}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ color: darkMode ? 'white' : '#1e293b' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="h-10"></div>
      </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="rounded-3xl p-6 hover:scale-[1.02] transition-all glass-effect">
      {/* Header */}
      <div className="mb-4">
        <h3 className={`text-xl font-medium text-right mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h3>
        {description && (
          <p className={`text-sm text-right ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
            {description}
          </p>
        )}
        <span className={`inline-block text-xs px-3 py-1 rounded-full mt-2 font-medium bg-white/20 backdrop-blur-sm border border-white/30 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
          {category}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className={`w-full rounded-full h-6 overflow-hidden ${darkMode ? 'bg-white/20' : 'bg-slate-200'}`}>
          <div
            className="h-6 rounded-full transition-all duration-500 flex items-center justify-center relative overflow-hidden bg-gradient-to-r from-green-400 to-blue-400"
            style={{
              width: `${Math.min(progressPercentage, 100)}%`
            }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            {progressPercentage > 10 && (
              <span className="text-white text-xs font-medium relative z-10">
                {progressPercentage}%
              </span>
            )}
          </div>
        </div>
        {progressPercentage <= 10 && (
          <p className={`text-center mt-1 text-sm font-medium ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
            {progressPercentage}%
          </p>
        )}
      </div>

      {/* Amounts */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-right">
          <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>יעד</p>
          <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            ₪{formatCurrency(targetAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>נחסך</p>
          <p className={`text-lg font-medium ${darkMode ? 'text-green-300' : 'text-green-600'}`}>
            ₪{formatCurrency(currentAmount)}
          </p>
        </div>
      </div>

      {/* Remaining amount */}
      <div className={`rounded-2xl p-3 mb-4 backdrop-blur-sm border ${darkMode ? 'bg-white/10 border-white/20' : 'bg-slate-100 border-slate-200'}`}>
        <p className={`text-sm text-right ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
          נותר לחסוך:
        </p>
        <p className={`text-lg font-medium text-right ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
          ₪{formatCurrency(targetAmount - currentAmount)}
        </p>
      </div>

      {/* Deadline */}
      {deadline && (
        <div className={`text-xs text-right flex items-center justify-end gap-1 ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
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

export default Dashboard;
