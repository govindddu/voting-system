import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phoneNumber: "",
        role: "VOTER",
        password: ""
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            console.log("API_BASE:", API_BASE);
            console.log("Form data:", form);
            const res = await axios.post(
                `${API_BASE}/auth/register`,
                {
                    fullName: form.fullName,
                    email: form.email,
                    phoneNumber: form.phoneNumber,
                    role: form.role,
                    password: form.password
                },
                {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            console.log("Success response:", res.data);
            setMessage(res.data.message || "Registration successful");
            setTimeout(() => navigate("/verify-email", { state: { email: form.email } }), 800);

        } catch (err) {
            console.error("REGISTER ERROR:", err.response?.data || err.message);
            setError(
                err.response?.data?.message ||
                "Registration failed. Please check your details."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card">
            <h2>Create account</h2>
            <p className="desc">Register with your role to access the voting system.</p>

            {error && <div className="status error">{error}</div>}
            {message && <div className="status success">{message}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                    Full name
                    <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        required
                    />
                </label>

                <label>
                    Email
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                </label>

                <label>
                    Phone number
                    <input
                        type="tel"
                        name="phoneNumber"
                        value={form.phoneNumber}
                        onChange={handleChange}
                        required
                    />
                </label>

                <label>
                    Role
                    <select name="role" value={form.role} onChange={handleChange}>
                        <option value="ADMIN">Admin</option>
                        <option value="VOTER">Voter</option>

                    </select>
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                </label>

                <button type="submit" disabled={loading}>
                    {loading ? "Creating account..." : "Create account"}
                </button>
            </form>

            <div className="auth-switch">
                Already registered? <Link to="/login">Sign in</Link>
            </div>
        </div>
    );
}

export default Register;
