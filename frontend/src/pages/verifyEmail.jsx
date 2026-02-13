import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialEmail = location.state?.email || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEmail((prev) => prev || initialEmail);
  }, [initialEmail]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await axios.post(`${API_BASE}/auth/verify-email-otp`, {
        email,
        otp,
      });

      setMessage(data?.message || "Email verified successfully");
      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await axios.post(`${API_BASE}/auth/send-email-otp`, {
        email,
      });
      setMessage(data?.message || "OTP sent to email");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Verify your email</h2>
      <p className="desc">Enter the OTP sent to your email.</p>

      {error && <div className="status error">{error}</div>}
      {message && <div className="status success">{message}</div>}

      <form className="auth-form" onSubmit={handleVerify}>
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

        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        <button type="button" className="ghost-btn" onClick={handleResend} disabled={resendLoading}>
          {resendLoading ? "Sending..." : "Resend OTP"}
        </button>
      </form>

      <div className="auth-switch">
        Back to <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}

export default VerifyEmail;
