# 🌍 NGO Registration and Donation Management System

A full-stack web application that allows users to register for NGO initiatives and optionally donate.  
The system ensures registration data is preserved independently of payment outcomes while enabling administrators to accurately monitor registrations and donations.

This project follows ethical payment handling practices using a sandbox payment gateway simulation.

---

## 🎯 Objectives

- ✅ Allow users to register independently of donation completion  
- ✅ Enable optional donations with proper tracking  
- ✅ Preserve user data regardless of payment outcome  
- ✅ Track donation status: success, pending, failed  
- ✅ Provide administrators with transparent monitoring tools  
- ✅ Use sandbox payment simulation (no real money involved)  

---

## 🚀 Features

### 👤 User Module
- User registration and login  
- View personal registration details  
- Make optional donations  
- Track donation history and payment status  

### 🛡 Admin Module
- Secure admin dashboard  
- View total registrations  
- View total donations and total amount collected  
- Filter donations by status and date  
- Export registration data as CSV  
- View donation analytics using charts  

### 💳 Payment Gateway (Sandbox Simulation)
- Fake payment gateway simulates real transaction flow  
- Donations start in `pending` state  
- Status updates only after confirmation  
- Failed and successful payments are recorded  
- No forced or fake success logic  

---

## 🛠 Tech Stack

### Frontend
- HTML  
- CSS  
- Bootstrap 5  
- JavaScript  

### Backend
- Node.js  
- Express.js  
- SQLite (Knex ORM)  
- JWT Authentication  

### Payment
- Custom Sandbox Gateway Simulation  

---


---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/AbhinavKumarrr/NGO-Registration-and-Donation-Management-System.git
cd NGO-Registration-and-Donation-Management-System
```


2️⃣ Backend Setup
cd backend
npm install
copy .env.example .env
npm run migrate
node src/seed_admin.js
npm run dev

Backend runs on:

http://localhost:4000

---


---

3️⃣ Frontend Setup

Open the following files directly in browser:

frontend/index.html
frontend/admin.html

🔐 Default Admin Credentials
Email: admin@example.com
Password: admin123

---


---

👨‍💻 Author

Abhinav Kumar
Undergraduate Student
Indian Institute of Technology Roorkee

GitHub: https://github.com/AbhinavKumarrr