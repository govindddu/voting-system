import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const { data } = await axios.post(`${API_BASE}/auth/login`, form);
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            const role = (data.user?.role || "").toUpperCase();
            if (role === "ADMIN") {
                navigate("/admin", { replace: true });
                return;
            }
            navigate("/voter", { replace: true });
        } catch (err) {
            const msg = err.response?.data?.message || "Login failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userRaw = localStorage.getItem("user");
        if (token && userRaw) {
            try {
                const user = JSON.parse(userRaw);
                const role = (user?.role || "").toUpperCase();
                if (role === "ADMIN") {
                    navigate("/admin", { replace: true });
                } else {
                    navigate("/voter", { replace: true });
                }
            } catch (_) {
                // ignore parse errors
            }
        }
    }, [navigate]);

    return (
        <div className="auth-card">
            <h2>Welcome back</h2>
            <p className="desc">Sign in with the email and password you registered.</p>

            {error && <div className="status error">{error}</div>}
            {message && <div className="status success">{message}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                    Email
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                    />
                </label>

                <button className="submit-btn" type="submit" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <div className="auth-switch">
                No account yet? <Link to="/register">Create one</Link>
            </div>
        </div>
    );
}

export default Login;
