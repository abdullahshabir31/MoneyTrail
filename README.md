# 💰 MoneyTrail — Personal Finance Tracker

**MoneyTrail** is a modern personal finance tracking Progressive Web App (PWA) built with **React, Vite, JavaScript, Tailwind CSS, and Supabase**.

It allows users to securely manage their personal finances by tracking income and expenses, organizing transactions into categories and subcategories, setting monthly budgets, managing recurring transactions, analyzing spending patterns, and exporting financial data.

---

## 🌐 Live Demo

**MoneyTrail:** https://moneytrail-tracker.vercel.app/

---

## 📖 About

MoneyTrail is a personal finance management application designed to make tracking everyday finances simple and organized.

Authenticated users can:

- Track income and expenses
- Organize transactions using categories and subcategories
- Add and manage payment methods
- Set monthly budgets
- Manage recurring transactions
- Analyze income, expenses, and savings
- View spending insights
- Export financial data
- Generate printable financial reports
- Manage their profile and preferences
- Sign in using email/password or Google
- Install the application as a PWA

User data is securely stored using **Supabase PostgreSQL**, with **Row Level Security (RLS)** protecting user-specific data.

---

# 🌐 Deployment

| Service           | Platform                | URL                                    |
| ----------------- | ----------------------- | -------------------------------------- |
| Frontend          | Vercel                  | https://moneytrail-tracker.vercel.app/ |
| Database          | Supabase                | Supabase PostgreSQL                    |
| Authentication    | Supabase Auth           | Supabase                               |
| Backend Functions | Supabase Edge Functions | Supabase                               |

---

# 🛠️ Tech Stack

## Frontend

- React 19
- JavaScript (ES6+)
- JSX
- Vite
- React Router DOM
- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide React
- Recharts
- React Hook Form
- Zod

## Backend & Database

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Edge Functions
- Row Level Security (RLS)

## PWA

- Progressive Web App (PWA)
- Service Worker
- Web App Manifest
- Installable application
- Offline-ready architecture

## Deployment

- Vercel

---

# ✨ Features

## 🔐 Authentication

- Email & Password Sign Up
- Email & Password Sign In
- Google OAuth / Continue with Google
- Remember Me functionality
- Persistent login using local storage
- Session-only login using session storage
- Forgot Password flow
- Email-based password reset
- Change password from Settings
- Automatic authentication-based redirects
- Protected application routes
- Secure logout
- Delete account functionality

### Account Deletion

Users can permanently delete their account and associated data through a secure **Supabase Edge Function**.

---

## 🏠 Dashboard

The dashboard provides a quick overview of the user's current financial situation.

- Monthly Income
- Monthly Expenses
- Current Balance
- Income vs. Expense bar chart
- Monthly balance trend
- Expense breakdown by category
- Recent transactions
- Quick-add transaction button

---

## 💳 Transactions

MoneyTrail provides a complete transaction management system.

### Transaction Management

- Add transactions
- Edit transactions
- Delete transactions
- Search transactions
- View transaction history
- Income and expense support

### Transaction Filters

- Income / Expense
- Category
- Payment method
- Date range
- Sorting order

### Transaction Information

Each transaction can contain:

- Amount
- Transaction type
- Date
- Category
- Subcategory / Item
- Payment method
- Description
- Optional note

---

## ➕ Add & Edit Transactions

Transactions can be created and edited through a reusable transaction dialog available throughout the application.

Features include:

- Income / Expense toggle
- Amount entry
- Date picker
- Category selection
- Subcategory / Item selection
- Payment method selection
- Create new category directly from the dialog
- Create new payment method directly from the dialog
- Recent item suggestions based on usage
- Optional description
- Optional notes

---

## 💰 Budgets

MoneyTrail allows users to create monthly budgets for expense categories.

- Set monthly budget per category
- Expense-based budget tracking
- Current month spending progress
- Visual progress bars
- Previous / next month navigation
- Delete budgets
- Compare spending against budget limits

---

## 🗂️ Categories & Subcategories

MoneyTrail provides flexible category management.

Users can:

- Create income categories
- Create expense categories
- Create subcategories/items
- Rename categories
- Rename subcategories/items
- Archive categories
- Unarchive categories
- Archive items
- Unarchive items
- Delete categories
- Delete items

Categories and subcategories are used throughout the transaction system.

---

## 🔁 Recurring Transactions

Users can create transactions that automatically repeat according to a schedule.

Supported frequencies:

- Daily
- Weekly
- Monthly
- Yearly

Features include:

- Create recurring transaction rules
- Automatically calculate next occurrence
- Enable / disable recurring rules
- Mark recurring transaction as completed
- Convert completed recurring transaction into a real transaction
- Automatically move the next occurrence date forward
- Delete recurring rules

---

## 📊 Analytics

MoneyTrail provides a dedicated analytics section for understanding financial activity.

- Month-by-month navigation
- Income statistics
- Expense statistics
- Savings statistics
- Income vs. expense charts
- Expense breakdown by category
- Spending insights
- Top spending categories

---

## ⚙️ Settings

Users can manage their account and application preferences from Settings.

### Profile

- Display name
- Currency selection

Supported currencies:

- PKR
- USD
- EUR
- GBP
- AED
- INR
- SAR

### Appearance

- Light mode
- Dark mode

### Payment Methods

Users can:

- Add payment methods
- Manage existing payment methods
- Use payment methods while creating transactions

### Data Export

Users can export their financial data as:

- CSV
- Printable PDF report

Export options include:

- All transactions
- Current month
- Custom date range

### Account

- Change password
- Log out
- Delete account

---

# 📱 Progressive Web App

MoneyTrail is built as an installable **Progressive Web App (PWA)**.

Features include:

- Installable on supported devices
- Web App Manifest
- Service Worker
- Offline-ready architecture
- Custom application icons
- Responsive mobile experience
- Custom install prompt

MoneyTrail can be used like a native application after installation on supported devices.

---

# 📱 Responsive Design

The application is designed for both desktop and mobile devices.

### Desktop

- Sidebar navigation
- Full dashboard layout
- Responsive charts and tables
- Desktop-friendly transaction management

### Mobile

- Mobile bottom navigation
- More menu sheet
- Responsive transaction interface
- Mobile-friendly dialogs
- Responsive charts and cards

---

# 🔐 Authentication & Security

MoneyTrail uses **Supabase Authentication** for secure user authentication and session management.

Supported authentication methods include:

- Email & Password
- Google OAuth

User-specific database access is protected through **PostgreSQL Row Level Security (RLS)**.

This ensures users can only access and manage their own financial data.

Sensitive credentials are stored using environment variables and are excluded from version control.

Account deletion is handled through a secure server-side **Supabase Edge Function**.

---

# 🗄️ Database

MoneyTrail uses **PostgreSQL through Supabase**.

The database manages application data including:

- User profiles
- Categories
- Subcategories / Items
- Transactions
- Budgets
- Recurring transactions
- Payment methods

The database uses **Row Level Security (RLS)** to protect user-specific information.

---

# 📂 Project Structure

```text
MoneyTrail/
│
├── public/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── lib/
│   ├── hooks/
│   └── ...
│
├── supabase/
│   ├── functions/
│   └── migrations/
│
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
├── vercel.json
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

Example:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Additional Supabase Edge Function secrets should be configured securely through Supabase and should **not** be exposed in the frontend environment.

> ⚠️ Never commit your `.env` file or expose sensitive Supabase server-side credentials.

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

Create a production build with:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

# 🚀 Deployment

MoneyTrail is deployed using **Vercel**.

The production application is available at:

https://moneytrail-tracker.vercel.app/

The project uses a Vercel SPA rewrite configuration so React Router routes work correctly when accessed directly.

---

# 🔒 Security

MoneyTrail follows secure configuration practices.

Sensitive credentials should never be committed to the repository, including:

- Supabase Service Role Key
- Supabase server-side credentials
- Private Edge Function secrets
- Other private environment variables

The `.env` file is excluded from version control using `.gitignore`.

Database access is additionally protected using **Row Level Security (RLS)**.

---

# 🏗️ Architecture

```text
                         React + Vite
                              │
                              │
                         React Router
                              │
                              ▼
                        MoneyTrail UI
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        Supabase Client              Recharts / UI
                │
                │
        ┌───────┴───────────────────────┐
        │                               │
        ▼                               ▼
  Supabase Auth                    PostgreSQL
        │                               │
        │                               ▼
        │                        Row Level Security
        │                               │
        ▼                               ▼
   User Sessions                 User Financial Data
                                        │
                    ┌───────────────────┼──────────────────┐
                    │                   │                  │
                    ▼                   ▼                  ▼
               Transactions          Budgets          Recurring
                    │
                    ▼
              Categories /
              Subcategories /
              Payment Methods

                         │
                         ▼
                 Supabase Edge Functions
                         │
                         ▼
                 Secure Server Operations


                         React + Vite
                              │
                              ▼
                           Vercel
```

---

# 📊 Project Highlights

- Modern React 19 application
- JavaScript + JSX
- Vite-powered development and build system
- React Router DOM
- Tailwind CSS
- shadcn/ui and Radix UI
- Recharts analytics
- React Hook Form + Zod
- Supabase backend infrastructure
- PostgreSQL database
- Supabase Authentication
- Google OAuth
- Row Level Security
- Supabase Edge Functions
- Personal finance tracking
- Income and expense management
- Category and subcategory management
- Monthly budgets
- Recurring transactions
- Financial analytics
- Spending insights
- CSV data export
- Printable PDF reports
- Installable PWA
- Responsive mobile and desktop interface
- Light and dark themes
- Secure account deletion
- Production deployment on Vercel

---

# 🚀 Live Project

### 💰 MoneyTrail

**Live Application:**

https://moneytrail-tracker.vercel.app/

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

If you found MoneyTrail useful or interesting, consider giving the repository a ⭐ on GitHub.

---

**MoneyTrail — Track your money. Understand your spending. Take control of your finances.**
