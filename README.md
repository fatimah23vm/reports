

# Daily Reports System - Deployment and Operation Guide

---

## Backend
- Node.js
- Express.js
- PostgreSQL
- Custom Middleware (Authentication & Authorization)

---

## Frontend
- React.js
- Vite
- Bootstrap
- Responsive Design (Mobile & Desktop)

---

## 📁 Project Structure
reports/
├── frontend/ # React Application
│ ├── src/
│ └── package.json
|
├── src/ # Backend
│ ├── config/ # Database configuration
│ ├── models/ # Database models
│ ├── routes/ # API routes
│ ├── middlewares/ # Authentication & authorization
│ └── index.js # Server entry point
├── uploads/ # Uploaded files
├── package.json
└── README.md

---

## Installation & Setup

### Clone the Repository
```bash
git clone https://github.com/fatimah23vm/reports.git
cd reports
Database Setup (PostgreSQL)
تأكد أن PostgreSQL مثبت.
أنشئ قاعدة بيانات.
عدل بيانات الاتصال داخل: src/config/db.js
const client = new Client({
  user: 'your_user',
  host: 'localhost',
  database: 'your_database',
  password: 'your_password',
  port: 5432,
});
Running the Project
Backend
npm install
node src/index.js
السيرفر يعمل على: http://localhost:3000
Frontend
cd frontend
npm install
npm run dev
الفرونت إند يعمل على: http://localhost:5173
Responsive Design
تم تصميم الواجهة باستخدام Bootstrap و React مع دعم كامل للجوال والديسكتوب.
التصميم متجاوب (Responsive) ويعمل بشكل منظم على:
Mobile
Desktop
Authentication & Authorization
النظام يحتوي على:
Middleware للتحقق من تسجيل الدخول
حماية Routes
صلاحيات مستخدمين (Role-based access)
Important Notes
يجب تشغيل PostgreSQL قبل تشغيل الباك إند
تأكد من أن CORS مضبوط في index.js
لا ترفع مجلد node_modules إلى GitHub
يفضل استخدام .env في بيئة الإنتاج
JWT للمصادقة
Middleware مخصص للصلاحيات Sub_admin (مهندس): إضافة وتعديل التقارير المخصصة
Development Commands Summary
Backend
npm install
node src/index.js
Frontend
cd frontend
npm install
npm run dev
Developer
Developed by: Fatimah Adeeb
Year: 2026
Repository: https://github.com/fatimah23vm/reports