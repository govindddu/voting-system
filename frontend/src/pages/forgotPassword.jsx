import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await axios.post(`${API_BASE}/auth/forgot-password/request-otp`, { email });
      setMessage(data?.message || "OTP sent to email");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await axios.post(`${API_BASE}/auth/forgot-password/reset`, {
        email,
        otp,
        newPassword,
      });
      setMessage(data?.message || "Password reset successful");
      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Forgot password</h2>
      <p className="desc">Reset your password using OTP sent to your email.</p>

      {error && <div className="status error">{error}</div>}
      {message && <div className="status success">{message}</div>}

      {step === 1 ? (
        <form className="auth-form" onSubmit={requestOtp}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={resetPassword}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            OTP
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              inputMode="numeric"
              required
            />
          </label>

          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <button type="button" className="ghost-btn" onClick={() => setStep(1)} disabled={loading}>
            Back
          </button>
        </form>
      )}

      <div className="auth-switch">
        Back to <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}

export default ForgotPassword;
