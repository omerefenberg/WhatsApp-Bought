# Bought Finance Bot - API Documentation

## Server Configuration

- **Base URL**: `http://localhost:3001`
- **API Prefix**: `/api`
- **CORS**: Enabled for `http://localhost:3000` (Dashboard)
- **Rate Limit**: 100 requests per 15 minutes per IP
- **Content-Type**: `application/json`

---

## 🔐 Authentication

Currently, the API uses `userId` (WhatsApp phone number) for user identification.
Pass `userId` as a query parameter or in the request body.

---

## 📊 Endpoints

### Health Check

#### `GET /api/health`
Server health status

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2025-12-09T19:00:00.000Z"
}
```

---

## 💰 Transactions

### Get All Transactions

#### `GET /api/transactions`

**Query Parameters:**
- `userId` (required): User's WhatsApp ID
- `category` (optional): Filter by category
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)
- `limit` (optional): Number of results (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "972501234567",
      "amount": 150,
      "category": "מזון",
      "description": "קניות בסופר",
      "date": "2025-12-09T10:30:00.000Z",
      "source": "text",
      "createdAt": "2025-12-09T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Get Single Transaction

#### `GET /api/transactions/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "972501234567",
    "amount": 150,
    "category": "מזון",
    "description": "קניות בסופר",
    "date": "2025-12-09T10:30:00.000Z",
    "source": "text"
  }
}
```

---

### Create Transaction

#### `POST /api/transactions`

**Request Body:**
```json
{
  "userId": "972501234567",
  "amount": 150,
  "category": "מזון",
  "description": "קניות בסופר",
  "date": "2025-12-09T10:30:00.000Z",
  "source": "dashboard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "972501234567",
    "amount": 150,
    "category": "מזון",
    "description": "קניות בסופר",
    "date": "2025-12-09T10:30:00.000Z",
    "source": "dashboard",
    "createdAt": "2025-12-09T10:30:00.000Z"
  }
}
```

---

### Update Transaction

#### `PUT /api/transactions/:id`

**Request Body:**
```json
{
  "amount": 200,
  "category": "תחבורה",
  "description": "מונית"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "amount": 200,
    "category": "תחבורה",
    "description": "מונית"
  }
}
```

---

### Delete Transaction

#### `DELETE /api/transactions/:id`

**Response:**
```json
{
  "success": true,
  "message": "טרנזקציה נמחקה בהצלחה"
}
```

---

## 📈 Statistics

### Daily Stats

#### `GET /api/stats/daily`

**Query Parameters:**
- `userId` (optional): Filter by user
- `days` (optional): Number of days to fetch (default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-12-09",
      "total": 450,
      "count": 3
    }
  ]
}
```

---

### Weekly Stats

#### `GET /api/stats/weekly`

**Query Parameters:**
- `userId` (optional): Filter by user
- `weeks` (optional): Number of weeks (default: 12)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "week": "2025-W50",
      "total": 1250,
      "count": 8
    }
  ]
}
```

---

### Monthly Stats

#### `GET /api/stats/monthly`

**Query Parameters:**
- `userId` (optional): Filter by user
- `months` (optional): Number of months (default: 12)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2025-12",
      "total": 5400,
      "count": 42,
      "breakdown": {
        "מזון": 1800,
        "תחבורה": 900,
        "בילויים": 1200
      }
    }
  ]
}
```

---

### Category Stats

#### `GET /api/stats/categories`

**Query Parameters:**
- `userId` (optional): Filter by user
- `startDate` (optional): From date
- `endDate` (optional): To date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "מזון",
      "value": 1800,
      "count": 15,
      "percentage": 33.3
    },
    {
      "name": "תחבורה",
      "value": 900,
      "count": 8,
      "percentage": 16.7
    }
  ]
}
```

---

## 💼 Budget

### Get Budget

#### `GET /api/budget`

**Query Parameters:**
- `userId` (optional): Filter by user

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "972501234567",
    "monthlyIncome": 10000,
    "categories": {
      "מזון": 2000,
      "תחבורה": 1000,
      "בילויים": 1500,
      "קניות": 1000,
      "בריאות": 500,
      "אחר": 500
    },
    "setupCompleted": true,
    "notificationEnabled": true,
    "threshold": 80
  }
}
```

---

### Update Budget

#### `PUT /api/budget`

**Request Body:**
```json
{
  "userId": "972501234567",
  "monthlyIncome": 12000,
  "categories": {
    "מזון": 2500,
    "תחבורה": 1200
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "monthlyIncome": 12000,
    "categories": {
      "מזון": 2500,
      "תחבורה": 1200
    }
  }
}
```

---

### Budget Comparison

#### `GET /api/budget/compare`

Compares budget vs actual spending for current month

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "מזון",
      "budget": 2000,
      "spent": 1800,
      "remaining": 200,
      "percentage": 90,
      "isOverBudget": false
    },
    {
      "category": "תחבורה",
      "budget": 1000,
      "spent": 1200,
      "remaining": -200,
      "percentage": 120,
      "isOverBudget": true
    }
  ]
}
```

---

## 🎯 Goals (NEW!)

### Get All Goals

#### `GET /api/goals`

**Query Parameters:**
- `userId` (required): User's WhatsApp ID
- `status` (optional): Filter by status (`active`, `completed`, `cancelled`)

**Response:**
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

**Categories:**
- `טיול` - Travel
- `רכישה` - Purchase
- `חירום` - Emergency
- `השקעה` - Investment
- `כללי` - General (default)

---

### Get Single Goal

#### `GET /api/goals/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "טיול ליוון",
    "targetAmount": 5000,
    "currentAmount": 1500,
    "progressPercentage": 30,
    "summary": {
      "percentage": 30,
      "remaining": 3500,
      "isCompleted": false,
      "daysRemaining": 204,
      "weeklyTarget": 135,
      "monthlyTarget": 583
    }
  }
}
```

---

### Create Goal

#### `POST /api/goals`

**Request Body:**
```json
{
  "userId": "972501234567",
  "title": "טיול ליוון",
  "description": "חיסכון לטיול קיץ ליוון",
  "targetAmount": 5000,
  "deadline": "2025-07-01",
  "category": "טיול"
}
```

**Required Fields:**
- `userId`
- `title`
- `targetAmount`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "972501234567",
    "title": "טיול ליוון",
    "targetAmount": 5000,
    "currentAmount": 0,
    "status": "active"
  }
}
```

---

### Update Goal

#### `PUT /api/goals/:id`

**Request Body:**
```json
{
  "title": "טיול ליוון ואיטליה",
  "targetAmount": 7000,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "טיול ליוון ואיטליה",
    "targetAmount": 7000
  }
}
```

---

### Delete Goal

#### `DELETE /api/goals/:id`

**Response:**
```json
{
  "success": true,
  "message": "יעד נמחק בהצלחה"
}
```

---

### Add Progress to Goal

#### `POST /api/goals/:id/progress`

**Request Body:**
```json
{
  "amount": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "currentAmount": 2000,
    "progressPercentage": 40,
    "summary": {
      "percentage": 40,
      "remaining": 3000,
      "isCompleted": false
    }
  },
  "message": "התקדמות נוספה בהצלחה"
}
```

**When goal is completed:**
```json
{
  "message": "🎉 יעד הושלם!"
}
```

---

### Get Goal Summary

#### `GET /api/goals/:id/summary`

**Response:**
```json
{
  "success": true,
  "data": {
    "percentage": 40,
    "remaining": 3000,
    "isCompleted": false,
    "daysRemaining": 180,
    "weeklyTarget": 128,
    "monthlyTarget": 555
  }
}
```

---

## 🚨 Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message in Hebrew",
  "details": "Additional details (optional)"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (missing or invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 🔄 Transaction Sources

The `source` field indicates where the transaction was created:
- `text` - Created via WhatsApp text message
- `receipt` - Created via receipt photo with Vision AI
- `dashboard` - Created via web dashboard
- `api` - Created via direct API call

---

## 📝 Data Models

### Transaction Schema
```typescript
{
  userId: string;          // WhatsApp ID (e.g., "972501234567")
  amount: number;          // Transaction amount
  category: string;        // Category name
  description: string;     // Transaction description
  date: Date;             // Transaction date
  source: string;         // "text" | "receipt" | "dashboard" | "api"
  imageUrl?: string;      // Receipt image URL (optional)
  createdAt: Date;        // Creation timestamp
  updatedAt: Date;        // Last update timestamp
}
```

### Goal Schema
```typescript
{
  userId: string;          // WhatsApp ID
  title: string;          // Goal title (max 100 chars)
  description?: string;   // Goal description (max 500 chars)
  targetAmount: number;   // Target amount (min: 1)
  currentAmount: number;  // Current saved amount (default: 0)
  deadline?: Date;        // Target deadline (optional)
  category: string;       // "טיול" | "רכישה" | "חירום" | "השקעה" | "כללי"
  status: string;         // "active" | "completed" | "cancelled"
  progressPercentage: number;  // Auto-calculated (0-100)
  weeklyTarget: number;   // Auto-calculated based on deadline
  monthlyTarget: number;  // Auto-calculated based on deadline
  completedAt?: Date;     // Completion timestamp (if completed)
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔌 Connection Test

Test your connection with:

```bash
curl http://localhost:3001/api/health
```

---

## 📦 Example: Complete Flow

### 1. Check if backend is running
```bash
GET http://localhost:3001/api/health
```

### 2. Get user's transactions
```bash
GET http://localhost:3001/api/transactions?userId=972501234567
```

### 3. Get user's goals
```bash
GET http://localhost:3001/api/goals?userId=972501234567&status=active
```

### 4. Get budget comparison
```bash
GET http://localhost:3001/api/budget/compare
```

### 5. Get category statistics
```bash
GET http://localhost:3001/api/stats/categories?userId=972501234567
```

---

## ✅ Dashboard Sync Checklist

Make sure your dashboard has:

- [ ] Base API URL configured: `http://localhost:3001/api`
- [ ] CORS enabled in backend for dashboard origin
- [ ] Error handling for all API calls
- [ ] Loading states for async operations
- [ ] User ID management (WhatsApp phone number)
- [ ] Date formatting (ISO 8601 ↔️ local display)
- [ ] Hebrew RTL support
- [ ] Goals page with progress visualization
- [ ] Transaction source filtering
- [ ] Category statistics charts
- [ ] Budget comparison with visual indicators

---

## 🆕 What's New in v2.4.0

### Goals API
- Complete CRUD operations for savings goals
- Progress tracking with automatic calculations
- Weekly/monthly target calculations
- Smart goal completion detection

### Enhanced Features
- Transaction source tracking (`text`, `receipt`, `dashboard`)
- Receipt scanning with Vision AI
- AI-powered monthly summaries
- Anomaly detection
- Smart savings suggestions
- Financial advice system

---

## 📞 Support

For issues or questions, check:
- Backend logs: Console output when running `node server.js`
- Network tab: Check API responses in browser DevTools
- CORS errors: Verify `ALLOWED_ORIGINS` in `.env`
