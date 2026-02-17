

// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SubAdminDashboard from './pages/SubAdminDashboard';
import ProjectReport from './pages/ProjectReport'; // ✅ إضافة صفحة التقرير

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/subadmin-dashboard" element={<SubAdminDashboard />} />
        <Route path="/project-report/:projectId" element={<ProjectReport />} /> {/* ✅ إضافة الراوت الجديد */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;