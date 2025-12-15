# WhatsApp Bought (bot)

Not just a bot, a complete financial management system consisting of a smart AI-powered WhatsApp bot and an advanced dashboard for data analysis.

## Overview

**Bought** is a personal financial management system that combines:

- Smart AI-powered WhatsApp bot for tracking expenses and income
- Interactive dashboard for data analysis and visualization
- Savings goals and budget management
- Automatic receipt scanning with Vision AI
- Automated monthly reports and summaries

## Project Structure

```
WhatsApp Bought (bot)
├── bought-finance-bot/      # Node.js server + WhatsApp bot
│   ├── models/              # MongoDB models
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   │   ├── ai/              # AI service
│   │   │   ├── AIService.js
│   │   │   └── prompts/     # Modular prompts
│   │   └── whatsapp.js
│   ├── utils/               # Utility functions
│   ├── .env.example         # Environment variables example
│   ├── package.json         # Dependencies
│   └── server.js            # Main entry point
├── bought-dashboard/        # React interface
│   ├── public/              # Static files
│   ├── src/                 # React code
│   └── package.json         # Dependencies
└── README.md               # This document
```

---

## Part 1: Bought Finance Bot

### Key Features

#### Financial Management

- Automatic recording of expenses and income in Hebrew
- Smart savings goals with automatic tracking
- Detailed statistics (daily, weekly, monthly)
- Monthly budget management by categories
- Budget overspending alerts (instant + daily)
- Automatic monthly summary at 8:00 PM at the end of each month
- Proactive daily alerts at 6:00 PM

#### Advanced Artificial Intelligence

- **Natural language monthly summaries** - Personal and interesting insights
- **Automatic anomaly detection** - Identifying unusual expenses
- **Personalized savings recommendations** - Practical advice
- **Smart financial consulting** - "Can I afford...?"
- **Receipt scanning from photos** - Upload a receipt image and get automatic extraction

#### Security

- Full security with Helmet and Rate Limiting
- MongoDB Sanitization and NoSQL Injection protection

### Installation and Running

#### Prerequisites

- Node.js (version 16 and above)
- MongoDB (local or Atlas)
- OpenAI account with API Key

#### Installation Steps

1. **Install dependencies**

```bash
cd bought-finance-bot
npm install
```

2. **Configure environment variables**

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

3. **Run the bot**

```bash
# Development mode
npm run dev

# Production mode
npm start
```

4. **Scan QR Code**

- Open WhatsApp on your mobile device
- Click on the menu (⋮) > WhatsApp Web
- Scan the QR Code that appears in the terminal

### Using the Bot

#### Recording Expenses

Simply write in natural language:

- "Bought coffee for 18 shekels"
- "Filled up gas for 300 NIS"
- "Received salary 15000"

Or send a picture of a receipt - the bot will automatically extract all the details!

#### Main Commands

**Statistics:**

- `How much did I spend` / `Status` - Monthly summary with AI
- `Today` - Daily summary
- `This week` - Weekly summary
- `Categories` - Breakdown by categories

**Savings Goals:**

- `/goal` - Create new goal
- `My goals` - Display all goals
- `Progress` - Track active goal

**Management:**

- `/budget` - Set budget
- `/help` - User guide

#### Available Categories

Food, Transportation, Shopping, Bills, Entertainment, Salary, Health, General

### API Endpoints

#### Transactions

```
GET    /api/transactions          - Get all transactions
GET    /api/transactions/:id      - Get single transaction
POST   /api/transactions          - Create new transaction
PUT    /api/transactions/:id      - Update transaction
DELETE /api/transactions/:id      - Delete transaction
```

#### Statistics

```
GET    /api/stats/daily           - Daily statistics
GET    /api/stats/weekly          - Weekly statistics
GET    /api/stats/monthly         - Monthly statistics
GET    /api/stats/categories      - Statistics by categories
```

#### Budget

```
GET    /api/budget                - Get budget
GET    /api/budget/compare        - Compare budget to expenses
```

#### Health

```
GET    /api/health                - Check server health
```

---

## Part 2: Bought Dashboard

### Dashboard Features

- **Advanced visualization** - Interactive charts (pie, bar, line)
- **Category analysis** - View expense breakdown by categories
- **Monthly reports** - Track trends over time
- **Budget comparison** - Monitor performance against planned budget
- **Responsive interface** - Supports mobile and desktop

### Installation and Running

1. **Install dependencies**

```bash
cd bought-dashboard
npm install
```

2. **Configure environment variables**
   Create a `.env` file in the `bought-dashboard` directory:

```env
REACT_APP_API_URL=http://localhost:3001
```

3. **Run the dashboard**

```bash
# Development mode
npm start

# Production build
npm run build
```

The dashboard will be available at: `http://localhost:3000`

### Technologies

- **Frontend**: React 19, TailwindCSS, Recharts
- **HTTP Client**: Axios
- **Routing**: React Router v7
- **Icons**: Lucide React

---

## Running the Complete System

To run the complete system, you need to run **two** servers in parallel:

### Terminal 1 - Backend + WhatsApp Bot

```bash
cd bought-finance-bot
npm run dev
```

### Terminal 2 - Frontend Dashboard

```bash
cd bought-dashboard
npm start
```

After running:

1. Scan the QR Code in WhatsApp
2. Open the dashboard in browser: `http://localhost:3000`
3. Start sending expenses via WhatsApp or add manually in the dashboard

---

## Technical Highlights

### Backend

- **MongoDB Indexes** - Optimal indexes for performance
- **Multi-user Support** - Support for multiple concurrent users
- **Error Handling** - Comprehensive error handling
- **Graceful Shutdown** - Orderly shutdown of services
- **Scheduled Tasks** - Scheduled tasks with node-cron
- **Vision AI** - GPT-4o Vision for receipt scanning

### Frontend

- **Component Architecture** - Modular architecture
- **Responsive Design** - Full mobile support
- **Real-time Updates** - Automatic data updates
- **Error Boundaries** - Component-level error handling

### Security

- **Helmet** - Protection against HTTP vulnerabilities
- **Rate Limiting** - 100 requests per 15 minutes
- **MongoDB Sanitization** - Protection against NoSQL Injection
- **CORS Protection** - Restrict access to authorized domains
- **Input Validation** - Input validation checks

---

## Troubleshooting

### Bot won't connect to WhatsApp

- Make sure WhatsApp Web is not active on another device
- Delete the `.wwebjs_auth/` folder and try again

### OpenAI Errors

- Verify the key is valid
- Make sure there's credit in the OpenAI account
- Check the rate limits

### MongoDB Connection Issues

- Make sure your IP is authorized in MongoDB Atlas
- Check connection details in .env

### Dashboard won't connect to server

- Make sure the server is running on port 3001
- Check `REACT_APP_API_URL` in .env
- Check CORS settings on the server

---

## Key Security

**Very important:**

- Don't upload `.env` files to Git
- Keep the OpenAI key secret
- Immediately replace exposed keys
- Use environment variables in production

---

## License

MIT License

---

## Support

For questions and issues, open an Issue on GitHub.

---

**Bought** - The smartest system for personal financial management in Hebrew
