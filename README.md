# Escrow-Based Payment Platform

A MERN-style backend-driven escrow system that enables secure milestone-based payments between clients and freelancers with dispute resolution and admin controls.

---

## 🚀 Project Overview

This application simulates how freelance platforms securely manage payments using an escrow system.

It supports:

- Role-based authentication (Client, Freelancer, Admin)
- Contract lifecycle management
- Escrow wallet system
- Milestone-based payment release
- Dispute resolution
- Admin arbitration 
- Transaction logging
- Auto upgrade contract status to completed, if all milestones are approved resolved and reached contract amount

---

## 🏗 Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt password hashing

### Frontend
- HTML
- CSS
- Vanilla JavaScript
- Fetch API

---

## 👥 User Roles

### Client
- Creates contracts
- Funds escrow (locked wallet)
- Creates milestones
- Approves or rejects milestones

### Freelancer
- Accepts contracts
- Completes work and mark submitted
- Raises disputes if rejected

### Admin
- Resolves disputes (Release / Refund / Split the contract amount) 
- Monitors transactions

---

## 💰 Payment Flow

1. Client funds escrow  
2. Money moves from walletBalance → lockedBalance  
3. Upon milestone approval:
   - lockedBalance decreases
   - Freelancer walletBalance increases
4. All actions are recorded in the Transaction collection

---

## 📄 Contract Lifecycle

PENDING → ACTIVE → COMPLETED

---

## 📌 Milestone Lifecycle

PENDING → SUBMITTED → APPROVED → DISPUTED(if Raised) → RESOLVED

---


