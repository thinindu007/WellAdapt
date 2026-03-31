/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { translations } from '../utils/translations';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    //Check if there is a saved language preference, otherwise default to English
    const [currentLang, setCurrentLang] = useState<'en' | 'si'>(
        (localStorage.getItem('lang') as 'en' | 'si') || 'en'
    );
    const t = translations[currentLang];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            //Send credentials to backend
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password
            });

            // Save the JWT token, user info, and the language preference
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Save the language returned from the DB
            const userLang = response.data.user.language;
            localStorage.setItem('lang', userLang);

            // Navigate to the chat interface
            navigate('/chat');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed. Please check your connection.');
        }
    };

    //toggle language on the login page 
    const toggleLanguage = (lang: 'en' | 'si') => {
        setCurrentLang(lang);
        localStorage.setItem('lang', lang);
    };

    return (
        <div className="app-root">
            <div className="auth-card">
                {/* Language Switcher for the Login Page */}
                <div className="login-lang-toggle">
                    <button
                        className={currentLang === 'en' ? 'active' : ''}
                        onClick={() => toggleLanguage('en')}
                    >
                        EN
                    </button>
                    <button
                        className={currentLang === 'si' ? 'active' : ''}
                        onClick={() => toggleLanguage('si')}
                    >
                        සිං
                    </button>
                </div>

                <h2>{t.welcome}</h2>
                <p className="auth-subtitle">{t.subtitle}</p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group-auth">
                        <label>{t.email}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@university.ac.lk"
                            required
                        />
                    </div>

                    <div className="input-group-auth">
                        <label>{t.password}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="auth-button">{t.login}</button>
                </form>

                <p className="auth-footer">
                    {t.noAcc} <Link to="/register">{t.clickHere}</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;