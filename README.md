# 🔮 AI Face Recognition Employee Attendance & Monitoring System

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)

An AI-powered employee attendance and monitoring system that uses real-time face recognition for automated attendance tracking. The project combines a modern React frontend with a FastAPI backend and MongoDB Atlas cloud database.

---

🌐 Live Demo

🚀 Live URL:
https://ai-face-recognition-based-attendanc.vercel.app

# ✨ Features

## 🧠 Real-Time Face Recognition
- Live face detection using OpenCV and Dlib
- Fast and accurate facial recognition pipeline
- Automatic facial embedding generation
- Real-time webcam attendance tracking

## ⚡ Automated Attendance System
- Contactless employee attendance marking
- Automatic check-in and check-out logging
- Late attendance detection
- Duplicate attendance prevention
- Working hours calculation

## 🎨 Admin Dashboard
- Interactive analytics dashboard
- Attendance statistics visualization
- Department-wise employee tracking
- Responsive modern UI with dark mode

## 👥 Employee Management
- Add, edit, and remove employees
- Department management
- Employee image registration
- Secure facial embedding storage

## 🔒 Security Features
- JWT authentication system
- Password hashing using bcrypt
- Protected API routes
- Secure MongoDB Atlas integration

---

# 🏗️ System Architecture

```mermaid
flowchart TB

    subgraph Frontend
        ReactUI[React + Vite Frontend]
    end

    subgraph Backend
        FastAPI[FastAPI Backend]
        FaceRec[Face Recognition Engine]
        Scheduler[Background Scheduler]
    end

    subgraph Database
        MongoDB[(MongoDB Atlas)]
    end

    ReactUI -->|API Requests| FastAPI
    FastAPI --> MongoDB
    FastAPI --> FaceRec
    FastAPI --> Scheduler
    FaceRec --> MongoDB
