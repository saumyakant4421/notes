import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import '../styles/styles.css';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? ''
  : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); 
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    if (!name || !dob || !email) {
      setError('All fields are required');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/signup`, { name, dob, email });
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
      const res = await axios.post(`${API_BASE_URL}/api/verify-signup`, { email, otp, name, dob });
      localStorage.setItem('token', res.data.token);
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
        <h1>Sign up</h1>
        <p className="subtitle">Sign up to enjoy the feature of HD</p>
        {error && <p className="error">{error}</p>}
        
        {step === 1 ? (
          <div className="form-container">
            <div className="input-group">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="Jonas Khanwald"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
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
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signup_with"
                shape="rectangular"
                theme="outline"
              />
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
            <button onClick={handleVerifyOTP} className="primary-button">Sign up</button>
          </div>
        )}
        
        <p className="auth-link">Already have an account? <a href="/signin">Sign in</a></p>
      </div>
      <div className="signup-image-side">
        <img src="/pasted-image.png" alt="Sign up visual" className="signup-side-image" />
      </div>
    </div>
  );
};

export default SignUp;