# CanteenIQ Web App

A demo-ready full-stack website for the CanteenIQ Shark Tank project.

## Features

### Student / User
- Separate student login
- Menu browsing
- Pre-order food
- Pickup slot selection
- Digital order token
- Order history
- Opt-in food preferences
- Personalized reorder suggestions

### Canteen Management
- Separate canteen-manager login
- Dashboard
- First-hour attendance entry
- Online order monitoring
- Offline bill/token entry
- Menu management
- Live demand forecast
- Food-wise preparation recommendations
- Waste/leftover logging

> Note: the current "AI forecast" is a transparent demo scoring model implemented on the server. It combines attendance, online orders, historical sales, time/day, weather context, and food popularity. It is intentionally easy to replace with a real ML model later.

## Default login

Student:
- Email: `student@canteeniq.local`
- Password: `student123`

Canteen Manager:
- Email: `manager@canteeniq.local`
- Password: `manager123`

## Requirements

- Node.js 18+ recommended
- VS Code

## Run

1. Extract the project.
2. Open the folder in VS Code.
3. Open the VS Code terminal.
4. Run:

```bash
npm install
npm start
```

5. Open:

http://localhost:3000

The server automatically creates `data/db.json` on first run.

## Project structure

```text
CanteenIQ_WebApp/
├─ public/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
├─ data/
│  └─ db.json              # auto-created; don't need to make manually
├─ package.json
├─ server.js
└─ README.md
```

## Important

This is a prototype / demo architecture. For a production system, add:
- real database
- role-based permissions beyond the demo role check
- HTTPS
- secure cookies instead of localStorage JWT
- real college ERP/attendance API
- payment gateway
- POS integration
- proper ML model and evaluation
- audit logs and consent/privacy controls
