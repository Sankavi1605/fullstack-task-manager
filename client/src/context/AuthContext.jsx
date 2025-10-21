// client/src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Note: Use { jwtDecode }
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect runs when the app loads
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        setUser(decodedUser.user);
      } catch (err) {
        // If token is invalid
        console.error('Invalid token:', err);
        setToken(null);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    // 1. Make API call
    const res = await api.post('/auth/login', { email, password });
    
    // 2. Get token and user from response
    const { token, user } = res.data;

    // 3. Set state
    setToken(token);
    setUser(user);

    // 4. Store token in localStorage
    localStorage.setItem('token', token);
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    
    // 1. Get token from response
    const { token } = res.data;

    // 2. Decode user info from token
    const decodedUser = jwtDecode(token);

    // 3. Set state
    setToken(token);
    setUser(decodedUser.user);

    // 4. Store token
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: !!token, // True if 'token' is not null
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// This is a custom hook that our components will use
// to easily access the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};