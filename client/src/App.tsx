// client/src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* This is our Protected Route.
        It protects all child routes (the 'element' inside).
        If you are logged in, it shows the <DashboardPage />.
        If you are NOT logged in, it redirects you to '/login'.
      */}
      <Route path="/" element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        {/* We will add more protected routes here, like /admin */}
      </Route>
    </Routes>
  );
}

export default App;