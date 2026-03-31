/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        preferredLanguage: 'en',
        religion: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        //Validation: Match Passwords
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            // Send registration data to backend
            await axios.post('http://localhost:5000/api/auth/register', {
                email: formData.email,
                password: formData.password,
                preferredLanguage: formData.preferredLanguage,
                religion: formData.religion
            });

            alert("Registration successful! Please login to continue.");
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed. Email might already be in use.');
        }
    };

    return (
        <div className="app-root">
            <div className="auth-card animate-slideIn">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Join WellAdapt for personalized support</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group-auth">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="name@university.ac.lk"
                            required
                        />
                    </div>

                    <div className="input-group-auth">
                        <label>Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="input-group-auth">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {/* Preferred Language Dropdown */}
                    <div className="input-group-auth">
                        <label>Preferred Language</label>
                        <select
                            className="auth-select"
                            value={formData.preferredLanguage}
                            onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                        >
                            <option value="en">English</option>
                            <option value="si">සිංහල (Sinhala)</option>
                        </select>
                    </div>

                    <div className="input-group-auth">
                        <label>Religion (for culturally adaptive tips)</label>
                        <select
                            className="auth-select"
                            value={formData.religion}
                            onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                            required
                        >
                            <option value="">Select your religion</option>
                            <option value="buddhist">Buddhist</option>
                            <option value="hindu">Hindu</option>
                            <option value="muslim">Muslim</option>
                            <option value="catholic">Catholic / Christian</option>
                        </select>
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="auth-button">Register</button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;