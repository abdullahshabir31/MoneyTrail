# 💰 MoneyTrail — Personal Finance & Expense Tracker

**MoneyTrail** is a modern personal finance management web application built with **React, Vite, JavaScript, Tailwind CSS, and Supabase**.

It allows users to manage their personal finances by tracking income and expenses, creating budgets, managing recurring transactions, and analyzing their financial activity through interactive dashboards and charts.

---

## 🌐 Live Demo

**MoneyTrail:** Coming Soon

---

## 📖 About

MoneyTrail is a modern personal finance tracker designed to help users manage their income, expenses, budgets, and recurring financial activities in one place.

The application provides a personalized financial dashboard where authenticated users can:

- Track income and expenses
- Add, edit, and delete transactions
- Organize transactions using categories and items
- Create and manage monthly budgets
- Monitor recurring transactions
- Analyze financial activity through charts
- Manage custom categories and items
- Configure account preferences
- Switch between Light and Dark mode
- Securely manage their account and personal financial data

**Supabase** provides authentication and PostgreSQL database functionality, while **React and Vite** power the frontend application.

---

# 🌐 Deployment

| Service        | Platform                | Status      |
| -------------- | ----------------------- | ----------- |
| Frontend       | Vercel                  | Coming Soon |
| Database       | Supabase                | Supabase    |
| Authentication | Supabase Auth           | Supabase    |
| Backend Logic  | Supabase Edge Functions | Supabase    |

---

# 🛠️ Tech Stack

## Frontend

- React 19
- JavaScript (ES6+)
- JSX
- Vite
- React Router DOM
- Tailwind CSS v4
- Radix UI
- shadcn/ui
- Lucide React
- Recharts
- Sonner

## Forms & Validation

- React Hook Form
- Zod
- @hookform/resolvers

## Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Edge Functions
- Row Level Security (RLS)

## Development Tools

- ESLint
- Prettier
- Vite

---

# ✨ Features

## 💰 Income & Expense Tracking

- Add income transactions
- Add expense transactions
- Edit existing transactions
- Delete transactions
- Transaction descriptions
- Transaction notes
- Transaction dates
- Payment method tracking
- Category and item organization
- Automatic transaction totals

## 📊 Financial Dashboard

- Overview of personal finances
- Total income
- Total expenses
- Current balance
- Financial activity overview
- Recent transactions
- Financial summaries
- Quick transaction creation

## 🧾 Transactions

- Dedicated transactions page
- View all financial transactions
- Sort transactions by date
- Track income and expenses separately
- Category-based transaction organization
- Item-level transaction organization
- Payment method tracking
- Transaction notes and descriptions

## 💳 Categories & Items

MoneyTrail provides a flexible category system for organizing financial activity.

### Expense Categories

- Food
- Groceries
- Transport
- Shopping
- Bills
- Utilities
- Entertainment
- Health
- Education
- Rent
- Travel
- Subscriptions
- Other

### Income Categories

- Salary
- Freelance
- Business
- Gift
- Investment
- Other

Users can also create their own custom categories and items.

## 📅 Budget Management

- Create monthly budgets
- Assign budgets to categories
- Track category spending
- Monitor budget usage
- Update existing budgets
- Delete budgets
- Prevent duplicate budgets for the same category and month

## 🔁 Recurring Transactions

- Create recurring financial transactions
- Support recurring income and expenses
- Configure transaction frequency
- Set next transaction date
- Track payment methods
- Add notes
- Enable or disable recurring transactions
- Manage existing recurring transactions

## 📈 Financial Analytics

MoneyTrail provides visual financial analytics using **Recharts**.

Analytics include:

- Income analysis
- Expense analysis
- Spending breakdown
- Category-based financial data
- Financial trends
- Interactive charts
- Visual financial summaries

## 🏷️ Category Management

- Create custom categories
- Separate income and expense categories
- Create custom items
- Activate or deactivate categories
- Activate or deactivate items
- Track item usage
- Track last-used items
- Default category and item support

## 👤 User Account

- Secure user authentication
- Personalized financial data
- User-specific profile
- Display name
- Currency preference
- Notification preferences
- Theme preferences
- Account settings

## 🌓 Theme Support

- Light mode
- Dark mode
- Theme persistence
- Responsive theme controls
- Desktop and mobile theme switching

## 📱 Responsive Design

MoneyTrail is designed for both desktop and mobile devices.

### Desktop

- Sidebar navigation
- Full dashboard layout
- Quick transaction actions
- Financial management tools

### Mobile

- Mobile navigation
- Bottom navigation bar
- Floating Add Transaction button
- Mobile-friendly menus
- Responsive layouts
- Touch-friendly interface

## 🔐 Authentication

MoneyTrail uses **Supabase Authentication** to securely manage user accounts and sessions.

Authentication is integrated with protected application routes so that personal financial information remains accessible only to authenticated users.

## 🗑️ Account Deletion

MoneyTrail includes secure account deletion functionality.

Because the Supabase Service Role Key must never be exposed inside a client-side application, account deletion is handled through a **Supabase Edge Function**.

The Edge Function:

1. Validates the authenticated user's session
2. Retrieves the authenticated user's ID
3. Uses the Supabase Service Role client
4. Permanently deletes the user's account
5. Removes related user data through PostgreSQL cascading rules

---

# 🔐 Authentication & Security

MoneyTrail uses **Supabase Authentication** and **PostgreSQL Row Level Security (RLS)** to protect user data.

Each user's financial information is associated with their authenticated user ID.

Database policies ensure that authenticated users can only access and manage their own:

- Profile
- Categories
- Items
- Transactions
- Budgets
- Recurring transactions

Sensitive configuration is handled through environment variables and excluded from version control.

The Supabase Service Role Key is never included in the client-side application.

---

# 🗄️ Database

MoneyTrail uses **PostgreSQL through Supabase**.

The database contains the following main tables:

### Profiles

Stores user-specific profile and preference information.

- Display name
- Currency
- Theme
- Budget notifications
- Recurring transaction notifications

### Categories

Stores income and expense categories.

### Items

Stores individual items belonging to categories.

### Transactions

Stores financial transactions including:

- Income
- Expenses
- Amount
- Date
- Category
- Item
- Description
- Note
- Payment method

### Budgets

Stores monthly category-based budgets.

### Recurring Transactions

Stores recurring income and expense information including:

- Amount
- Category
- Item
- Frequency
- Next date
- Payment method
- Notes
- Active status

---

# 🛡️ Row Level Security

All user-specific database tables use **PostgreSQL Row Level Security (RLS)**.

The database policies ensure that users can only access records associated with their authenticated account.

The application uses the authenticated user's ID to securely associate data with their account.

---

# ⚡ Supabase Edge Function

MoneyTrail includes a Supabase Edge Function for secure account deletion.

### Function

```text
supabase/functions/delete-account/
```

The function validates the user's authentication token before using the Supabase Service Role Key to permanently delete the account.

Deploy the function using:

```bash
supabase functions deploy delete-account
```

The Service Role Key must remain on the Supabase server and should never be exposed to the frontend.

---

# 📂 Project Structure

```text
MoneyTrail/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── ui/
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── useAuth.jsx
│   │   ├── useDataQuery.js
│   │   ├── useFinance.js
│   │   ├── useTheme.js
│   │   └── ...
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.js
│   │       └── types.js
│   │
│   ├── layouts/
│   │   └── ProtectedLayout.jsx
│   │
│   ├── lib/
│   │   ├── finance.js
│   │   ├── errorReporting.js
│   │   └── utils.js
│   │
│   ├── pages/
│   │   ├── AnalyticsPage.jsx
│   │   ├── AuthPage.jsx
│   │   ├── BudgetsPage.jsx
│   │   ├── CategoriesPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── RecurringPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── TransactionsPage.jsx
│   │   └── ...
│   │
│   ├── services/
│   │   └── accountService.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── supabase/
│   ├── functions/
│   │   └── delete-account/
│   │       └── index.ts
│   │
│   ├── migrations/
│   │   └── *.sql
│   │
│   └── config.toml
│
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── jsconfig.json
├── package.json
├── vite.config.js
└── README.md
```

---

# ⚙️ Local Development

## 1. Clone Repository

```bash
git clone https://github.com/abdullahshabir31/MoneyTrail.git
cd MoneyTrail
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Configure Environment Variables

Create a `.env` file using `.env.example` as a reference.

Required environment variables:

```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"
```

> ⚠️ Never commit your `.env` file or expose your Supabase Service Role Key.

## 4. Start Development Server

```bash
npm run dev
```

The application will run at:

```text
http://localhost:5173
```

---

# 🏗️ Build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

# 🧹 Linting

Run ESLint:

```bash
npm run lint
```

---

# ✨ Formatting

Format the project using Prettier:

```bash
npm run format
```

---

# 🔒 Security

MoneyTrail follows secure configuration practices by keeping sensitive credentials inside environment variables.

The following credentials should never be committed to the repository:

- Supabase Service Role Key
- Supabase private credentials
- Database credentials
- Private environment variables

The `.env` file is excluded from version control through `.gitignore`.

Database access is additionally protected through **Row Level Security (RLS)**.

Account deletion is handled through a Supabase Edge Function so privileged credentials never reach the browser.

---

# 🏗️ Architecture

```text
                     React Application
                            │
                            ▼
                     React Router DOM
                            │
                            ▼
                       Vite Build
                            │
                            ▼
                      Frontend UI
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       Supabase Client              React Components
              │                           │
              ▼                           ▼
       Supabase Auth              Financial Features
              │                           │
              │                ┌──────────┼──────────┐
              │                │          │          │
              ▼                ▼          ▼          ▼
        Authenticated       Dashboard  Budgets  Analytics
           User
              │
              ▼
        PostgreSQL
              │
      ┌───────┼────────┬──────────────┐
      │       │        │              │
      ▼       ▼        ▼              ▼
  Profiles Categories Transactions  Budgets
                         │
                         ▼
                 Recurring Transactions
              │
              ▼
      Row Level Security
              │
              ▼
       User-specific Data


             Account Deletion
                    │
                    ▼
          Supabase Edge Function
                    │
                    ▼
        Service Role Authentication
                    │
                    ▼
          Supabase Auth Admin API
                    │
                    ▼
             Account Deletion
```

---

# 📊 Project Highlights

- Modern React 19 Application
- JavaScript + JSX
- Vite-powered development and build system
- React Router DOM
- Tailwind CSS v4
- shadcn/ui
- Radix UI
- Supabase Backend Infrastructure
- PostgreSQL Database
- Supabase Authentication
- Row Level Security
- Supabase Edge Functions
- Personal Finance Dashboard
- Income & Expense Tracking
- Monthly Budget Management
- Recurring Transactions
- Category Management
- Custom Financial Items
- Financial Analytics
- Recharts Data Visualization
- Light & Dark Mode
- Responsive Mobile Design
- Protected Routes
- Secure Account Deletion
- Environment-based Configuration

---

# 🚀 Project Status

MoneyTrail is actively being developed as a personal finance management platform.

Current core functionality includes:

- Authentication
- Dashboard
- Transactions
- Categories
- Budgets
- Recurring Transactions
- Analytics
- Settings
- Supabase database integration
- Row Level Security
- Account deletion through Edge Functions

---

# 🚀 Project Repository

**GitHub Repository:**

https://github.com/abdullahshabir31/MoneyTrail

---

# 👨‍💻 Author

## Abdullah Shabir

### Connect With Me

- **GitHub:** https://github.com/abdullahshabir31
- **LinkedIn:** https://www.linkedin.com/in/abdullahshabir31/
- **Portfolio:** https://abdullah-myportfolio.vercel.app/

---

## ⭐ Support

If you found MoneyTrail interesting or useful, consider giving the repository a ⭐ on GitHub.

---

**MoneyTrail — Your personal finance, expense tracking, budgeting, and financial analytics platform.**
