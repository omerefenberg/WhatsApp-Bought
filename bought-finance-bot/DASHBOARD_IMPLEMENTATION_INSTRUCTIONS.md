# 🎯 Dashboard Implementation - Goals Display Only

## Overview

Add a **Goals page** to the dashboard that displays savings goals with progress visualization.
**Display only:** Show goal title and progress (X out of Y achieved). No create/edit/delete functionality needed.

---

## Backend API Information

**Base URL:** `http://localhost:3001/api`

**Endpoint to use:** `GET /api/goals`

**Query Parameters:**
- `userId` (required): User's WhatsApp phone number (e.g., "972501234567")
- `status` (optional): Filter by status - use `"active"` to show only active goals

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "972501234567",
      "title": "טיול ליוון",
      "description": "חיסכון לטיול קיץ ליוון",
      "targetAmount": 5000,
      "currentAmount": 1500,
      "deadline": "2025-07-01T00:00:00.000Z",
      "category": "טיול",
      "status": "active",
      "progressPercentage": 30,
      "weeklyTarget": 135,
      "monthlyTarget": 583,
      "createdAt": "2025-12-01T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Important Fields:**
- `title` - Goal name (string)
- `currentAmount` - Amount saved so far (number)
- `targetAmount` - Goal amount (number)
- `progressPercentage` - Calculated percentage 0-100 (number)
- `deadline` - Optional target date (ISO string or null)
- `category` - Goal category: "טיול", "רכישה", "חירום", "השקעה", "כללי"

---

## Implementation Tasks

### Task 1: Create Goals Service

Create a new file: `src/services/goalsService.js` (or `.ts`)

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const goalsService = {
  /**
   * Get all goals for a user
   * @param {string} userId - User's WhatsApp phone number
   * @param {string} status - Optional: 'active', 'completed', 'cancelled'
   * @returns {Promise} API response with goals array
   */
  getAllGoals: async (userId, status = 'active') => {
    const params = { userId };
    if (status) params.status = status;

    const response = await axios.get(`${API_BASE_URL}/goals`, { params });
    return response.data;
  }
};
```

**TypeScript version:**
```typescript
import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

interface Goal {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  status: 'active' | 'completed' | 'cancelled';
  progressPercentage: number;
  weeklyTarget?: number;
  monthlyTarget?: number;
  createdAt: string;
}

interface GoalsResponse {
  success: boolean;
  data: Goal[];
  count: number;
}

export const goalsService = {
  getAllGoals: async (userId: string, status: string = 'active'): Promise<GoalsResponse> => {
    const params: any = { userId };
    if (status) params.status = status;

    const response: AxiosResponse<GoalsResponse> = await axios.get(
      `${API_BASE_URL}/goals`,
      { params }
    );
    return response.data;
  }
};
```

---

### Task 2: Create Goals Page Component

Create a new file: `src/pages/Goals.jsx` (or `Goals.tsx`)

**React/JavaScript:**
```jsx
import React, { useState, useEffect } from 'react';
import { goalsService } from '../services/goalsService';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // IMPORTANT: Replace with actual userId from your auth/context
  const userId = '972501234567'; // TODO: Get from auth context or user state

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">טוען יעדים...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-right">יעדי חיסכון</h1>

      {goals.length === 0 ? (
        <div className="text-center text-gray-500 mt-12">
          <p className="text-xl">אין יעדים פעילים</p>
          <p className="text-sm mt-2">צור יעד חדש בWhatsApp באמצעות הפקודה /יעד</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal._id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
};

const GoalCard = ({ goal }) => {
  const {
    title,
    description,
    targetAmount,
    currentAmount,
    progressPercentage,
    category,
    deadline
  } = goal;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-r-4 border-blue-500 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-right mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 text-right">{description}</p>
        )}
        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2">
          {category}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            {progressPercentage > 10 && (
              <span className="text-white text-xs font-bold">
                {progressPercentage}%
              </span>
            )}
          </div>
        </div>
        {progressPercentage <= 10 && (
          <p className="text-center mt-1 text-sm font-bold text-gray-700">
            {progressPercentage}%
          </p>
        )}
      </div>

      {/* Amounts */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-right">
          <p className="text-sm text-gray-500">יעד</p>
          <p className="text-lg font-bold text-gray-800">
            ₪{targetAmount.toLocaleString('he-IL')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">נחסך</p>
          <p className="text-lg font-bold text-green-600">
            ₪{currentAmount.toLocaleString('he-IL')}
          </p>
        </div>
      </div>

      {/* Remaining amount */}
      <div className="bg-gray-50 rounded p-3 mb-4">
        <p className="text-sm text-gray-600 text-right">נותר לחסוך:</p>
        <p className="text-xl font-bold text-right text-orange-600">
          ₪{(targetAmount - currentAmount).toLocaleString('he-IL')}
        </p>
      </div>

      {/* Deadline */}
      {deadline && (
        <div className="text-xs text-gray-500 text-right">
          📅 יעד: {new Date(deadline).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      )}
    </div>
  );
};

export default Goals;
```

**TypeScript version:**
```tsx
import React, { useState, useEffect } from 'react';
import { goalsService } from '../services/goalsService';

interface Goal {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: string;
  status: string;
  progressPercentage: number;
  weeklyTarget?: number;
  monthlyTarget?: number;
  createdAt: string;
}

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = '972501234567'; // TODO: Get from auth context

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">טוען יעדים...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-right">יעדי חיסכון</h1>

      {goals.length === 0 ? (
        <div className="text-center text-gray-500 mt-12">
          <p className="text-xl">אין יעדים פעילים</p>
          <p className="text-sm mt-2">צור יעד חדש בWhatsApp באמצעות הפקודה /יעד</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal._id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
};

interface GoalCardProps {
  goal: Goal;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const {
    title,
    description,
    targetAmount,
    currentAmount,
    progressPercentage,
    category,
    deadline
  } = goal;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-r-4 border-blue-500 hover:shadow-xl transition-shadow">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-right mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 text-right">{description}</p>
        )}
        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2">
          {category}
        </span>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            {progressPercentage > 10 && (
              <span className="text-white text-xs font-bold">
                {progressPercentage}%
              </span>
            )}
          </div>
        </div>
        {progressPercentage <= 10 && (
          <p className="text-center mt-1 text-sm font-bold text-gray-700">
            {progressPercentage}%
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-right">
          <p className="text-sm text-gray-500">יעד</p>
          <p className="text-lg font-bold text-gray-800">
            ₪{targetAmount.toLocaleString('he-IL')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">נחסך</p>
          <p className="text-lg font-bold text-green-600">
            ₪{currentAmount.toLocaleString('he-IL')}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded p-3 mb-4">
        <p className="text-sm text-gray-600 text-right">נותר לחסוך:</p>
        <p className="text-xl font-bold text-right text-orange-600">
          ₪{(targetAmount - currentAmount).toLocaleString('he-IL')}
        </p>
      </div>

      {deadline && (
        <div className="text-xs text-gray-500 text-right">
          📅 יעד: {new Date(deadline).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      )}
    </div>
  );
};

export default Goals;
```

---

### Task 3: Add Route

Add the Goals route to your router configuration.

**React Router v6:**
```jsx
// In your App.jsx or router file
import Goals from './pages/Goals';

// Inside your Routes:
<Route path="/goals" element={<Goals />} />
```

**Example full router:**
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Transactions from './pages/Transactions';
// ... other imports

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/goals" element={<Goals />} />
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### Task 4: Add Navigation Link

Add a link to the Goals page in your navigation component.

**Example Navigation:**
```jsx
// In your Sidebar/Navigation component
import { NavLink } from 'react-router-dom';

<nav>
  <NavLink to="/" className="nav-item">
    🏠 דף הבית
  </NavLink>
  <NavLink to="/transactions" className="nav-item">
    💰 טרנזקציות
  </NavLink>
  <NavLink to="/goals" className="nav-item">
    🎯 יעדי חיסכון
  </NavLink>
  {/* ... other links */}
</nav>
```

**With Tailwind CSS active styles:**
```jsx
<NavLink
  to="/goals"
  className={({ isActive }) =>
    isActive
      ? 'flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded'
      : 'flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded'
  }
>
  🎯 יעדי חיסכון
</NavLink>
```

---

### Task 5: Update User ID

**CRITICAL:** Replace the hardcoded userId with the actual user ID from your authentication system.

**If using Context:**
```jsx
import { useAuth } from '../context/AuthContext';

const Goals = () => {
  const { user } = useAuth();
  const userId = user?.phoneNumber || user?.id;

  // ... rest of component
};
```

**If using Redux:**
```jsx
import { useSelector } from 'react-redux';

const Goals = () => {
  const userId = useSelector(state => state.auth.user.phoneNumber);

  // ... rest of component
};
```

**If stored in localStorage:**
```jsx
const Goals = () => {
  const userId = localStorage.getItem('userId') || '972501234567';

  // ... rest of component
};
```

---

## Environment Setup

### Check CORS Configuration

Ensure the backend allows requests from your dashboard URL.

**Backend .env file should include:**
```
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

(Add your dashboard's port - React default is 3000, Vite default is 5173)

---

## Testing Instructions

### 1. Start Backend
```bash
cd /path/to/bought-finance-bot
node server.js
```

Should see:
```
🌐 API Server: http://localhost:3001
```

### 2. Test API Manually
Open browser console and run:
```javascript
fetch('http://localhost:3001/api/goals?userId=972501234567&status=active')
  .then(r => r.json())
  .then(console.log);
```

Expected response:
```json
{
  "success": true,
  "data": [...],
  "count": 0
}
```

### 3. Start Dashboard
```bash
cd /path/to/dashboard
npm start
# or
npm run dev
```

### 4. Navigate to Goals Page

Go to: `http://localhost:3000/goals` (or your dashboard URL)

**Expected Behavior:**
- ✅ Page loads without errors
- ✅ Shows "טוען יעדים..." briefly
- ✅ If no goals: Shows "אין יעדים פעילים"
- ✅ If goals exist: Shows goal cards with progress bars
- ✅ Network tab shows successful API request

---

## Troubleshooting

### CORS Error
**Symptom:** Console shows: `Access to fetch has been blocked by CORS policy`

**Fix:**
1. Check backend `.env` file includes your dashboard URL in `ALLOWED_ORIGINS`
2. Restart backend server
3. Refresh dashboard

### 404 Error
**Symptom:** `GET http://localhost:3001/api/goals 404`

**Fix:**
1. Verify backend is running: `curl http://localhost:3001/api/health`
2. Check that `routes/api.js` contains Goals endpoints
3. Restart backend

### Empty Goals List
**Symptom:** Shows "אין יעדים פעילים" even though goals exist

**Fix:**
1. Verify correct `userId` is being sent
2. Check Network tab - inspect request parameters
3. Test with different userId
4. Create a test goal in WhatsApp: send `/יעד` to the bot

### userId is undefined
**Symptom:** Error: `userId הוא שדה חובה`

**Fix:**
1. Verify user authentication is working
2. Check that userId is correctly retrieved from auth context/state
3. Temporarily hardcode userId for testing: `const userId = '972501234567';`

---

## Design Customization

The provided component uses **Tailwind CSS**. If your dashboard uses different styling:

### Bootstrap:
Replace Tailwind classes:
- `bg-white rounded-lg shadow-lg p-6` → `card p-4`
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` → `row`
- `text-xl font-bold` → `h4 fw-bold`

### Material-UI:
Use MUI components:
- `Card`, `CardContent` instead of divs
- `Typography` for text
- `LinearProgress` for progress bar

### Custom CSS:
Add a `goals.css` file and create custom classes.

---

## File Structure Summary

After implementation, you should have:

```
dashboard/
├── src/
│   ├── services/
│   │   └── goalsService.js          ← NEW
│   ├── pages/
│   │   └── Goals.jsx                ← NEW
│   ├── App.jsx                      ← MODIFIED (add route)
│   └── components/
│       └── Navigation.jsx           ← MODIFIED (add link)
```

---

## Success Checklist

Before marking as complete, verify:

- [ ] Backend is running on port 3001
- [ ] Dashboard is running and accessible
- [ ] Goals service file created with `getAllGoals` function
- [ ] Goals page component created with loading/error states
- [ ] Route added to router configuration
- [ ] Navigation link added and accessible
- [ ] userId correctly retrieved from auth system
- [ ] CORS configured properly
- [ ] Network tab shows successful API call
- [ ] Goals display correctly with progress bars
- [ ] Empty state shows when no goals exist
- [ ] All amounts formatted with ₪ symbol
- [ ] Hebrew text displays right-to-left (RTL)

---

## Example API Response for Testing

If you want to test with mock data before backend is ready:

```javascript
const mockGoals = [
  {
    _id: "1",
    title: "טיול לאיטליה",
    description: "חיסכון לטיול משפחתי",
    targetAmount: 10000,
    currentAmount: 3500,
    progressPercentage: 35,
    category: "טיול",
    deadline: "2025-08-15T00:00:00.000Z",
    status: "active"
  },
  {
    _id: "2",
    title: "מחשב חדש",
    description: "MacBook Pro",
    targetAmount: 8000,
    currentAmount: 8000,
    progressPercentage: 100,
    category: "רכישה",
    status: "completed"
  }
];
```

---

## Questions or Issues?

If you encounter any problems:

1. Check browser console for errors
2. Check Network tab for API responses
3. Verify backend logs for errors
4. Review [API_DOCS.md](API_DOCS.md) for full API documentation
5. Review [DASHBOARD_SYNC_GUIDE.md](DASHBOARD_SYNC_GUIDE.md) for troubleshooting

---

**Implementation Time:** ~15-20 minutes

**Difficulty:** Easy

**Result:** Beautiful goals page with progress visualization! 🎯
