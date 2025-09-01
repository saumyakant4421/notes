import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import Dashboard from './components/Dashboard';
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  let googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
 
  if (!googleClientId && typeof window !== 'undefined' && (window as any).__ENV?.REACT_APP_GOOGLE_CLIENT_ID) {
    googleClientId = (window as any).__ENV.REACT_APP_GOOGLE_CLIENT_ID;
  }
  
  return (
    <div>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <Router>
            <Routes>
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/" element={<SignIn />} />
            </Routes>
          </Router>
        </GoogleOAuthProvider>
      ) : (
        <Router>
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<SignIn />} />
          </Routes>
        </Router>
      )}
    </div>
  );
}

export default App;