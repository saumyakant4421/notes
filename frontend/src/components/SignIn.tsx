import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/styles.css';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? ''
  : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); 
  const [error, setError] = useState('');
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const navigate = useNavigate();
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || (typeof window !== 'undefined' && (window as any).__ENV?.REACT_APP_GOOGLE_CLIENT_ID) || '';

  const handleSendOTP = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/login`, { email });
      setStep(2);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setError('OTP is required');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE_URL}/api/verify-login`, { email, otp });
      localStorage.setItem('token', res.data.token);
      if (keepLoggedIn) localStorage.setItem('keepLoggedIn', 'true'); 
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/google-auth`, { token: credentialResponse.credential });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Google authentication failed');
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed');
  };

  return (
    <div className="signup-flex-container">
      <div className="signup-form-side">
        <div className="logo-container">
          <img src="/logo192.png" alt="HD" className="logo" />
          <span className="logo-text">HD</span>
        </div>
        <h1>Sign in</h1>
        <p className="subtitle">Please login to continue to your account.</p>
        {error && <p className="error">{error}</p>}
        
        {step === 1 ? (
          <div className="form-container">
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="jonas.kahnwald@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button onClick={handleSendOTP} className="primary-button">Get OTP</button>
            <div className="google-login-container">
              {googleClientId && (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text="signin_with"
                  shape="rectangular"
                  theme="outline"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="form-container">
            <div className="input-group">
              <label>OTP</label>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <a href="#" onClick={handleSendOTP} className="resend-otp">Resend OTP</a>
            <label className="keep-logged-in">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
              />
              Keep me logged in
            </label>
            <button onClick={handleVerifyOTP} className="primary-button">Sign in</button>
          </div>
        )}
        
        <p className="auth-link">Need an account? <a href="/signup">Create one</a></p>
      </div>
      <div className="signup-image-side">
        <img src="/pasted-image.png" alt="Sign in visual" className="signup-side-image" />
      </div>
    </div>
  );
};

export default SignIn;