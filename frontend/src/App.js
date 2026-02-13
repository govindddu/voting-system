import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Login from "./pages/login.jsx";
import Register from "./pages/register.jsx";
import VerifyEmail from "./pages/verifyEmail.jsx";
import ForgotPassword from "./pages/forgotPassword.jsx";
import AdminHome from "./pages/adminHome.jsx";
import VoterVerification from "./pages/voterVerification.jsx";
import CandidateVerification from "./pages/candidateVerification.jsx";
import VoterHome from "./pages/voterHome.jsx";
import "./App.css";

const AuthLayout = () => (
  <div className="auth-layout">
    <div className="auth-grid">
      <div className="auth-hero">
        <p className="eyebrow">Secure E-Voting Platform</p>
        <h1>Sign in or create your account to manage elections.</h1>
        <p className="subtext">
          Use your registered email to access the dashboard. New voters and
          admins can register with the appropriate role.
        </p>
        <div className="cta-row">
          <Link className="ghost-btn" to="/login">
            Go to Login
          </Link>
          <Link className="primary-btn" to="/register">
            Create Account
          </Link>
        </div>
      </div>

      <main className="auth-card-wrapper">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  </div>
);

const MainLayout = () => (
  <Routes>
    <Route path="/admin" element={<AdminHome />} />
    <Route path="/admin/voters" element={<VoterVerification />} />
    <Route path="/admin/candidates" element={<CandidateVerification />} />
    <Route path="/voter" element={<VoterHome />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

function AppRouter() {
  const location = useLocation();
  const isAuthRoute = [
    "/",
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
  ].includes(location.pathname);

  return isAuthRoute ? <AuthLayout /> : <MainLayout />;
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
