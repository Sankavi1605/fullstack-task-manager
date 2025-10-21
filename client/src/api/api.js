// client/src/api/api.js

import axios from 'axios';

// Create an 'instance' of axios
const api = axios.create({
  baseURL: 'http://localhost:4000/api', // Our backend's base URL
});

/*
  This is a 'request interceptor'. It's a function that runs
  BEFORE any API request is sent. It checks if we have a token
  in localStorage. If we do, it adds it to the request header.
*/
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;