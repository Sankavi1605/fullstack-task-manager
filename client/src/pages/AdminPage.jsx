// client/src/pages/AdminPage.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/api';
import AdminTasksSection from '../components/AdminTasksSection';

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state for creating new users
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Users list state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch users.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [user]);

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!username.trim() || !email.trim() || !password.trim()) {
      setCreateError('All fields are required.');
      return;
    }

    try {
      setCreating(true);
      await api.post('/admin/users', {
        username: username.trim(),
        email: email.trim(),
        password,
        role,
      });
      setCreateSuccess(`User created successfully as ${role}.`);
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('ADMIN');
      fetchUsers(); // Refresh the list
    } catch (err) {
      setCreateError(
        err.response?.data?.message || 'Failed to create user.'
      );
    } finally {
      setCreating(false);
    }
  };

  // Handle role change
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(
        users.map((u) =>
          u.user_id === userId ? { ...u, role: newRole } : u
        )
      );
    } catch (err) {
      alert('Failed to update role: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return null; // or a loading spinner
  }

  return (
    <>
      <Navbar />
      <div className="container admin-container">
        <h1 className="admin-title">Admin Panel</h1>
        <button className="btn-back" style={{marginBottom: '2rem'}} onClick={() => navigate(-1)}>
          Back
        </button>

        {/* Create User Section */}
        <section className="admin-section">
          <h2>Create New User</h2>
          <form onSubmit={handleCreateUser} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="USER">User</option>
                </select>
              </div>
            </div>
            {createError && <p className="error-message">{createError}</p>}
            {createSuccess && <p className="success-message">{createSuccess}</p>}
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </section>

        {/* Users List Section */}
        <section className="admin-section">
          <h2>Manage Users</h2>
          {error && <p className="error-message">{error}</p>}
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id}>
                      <td>{u.user_id}</td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role.toLowerCase()}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        {u.user_id !== user.id && (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u.user_id, e.target.value)
                            }
                            className="role-select"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="USER">User</option>
                          </select>
                        )}
                        {u.user_id === user.id && <span className="text-muted">You</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* All Tasks Section - moved here for better flow */}
        <AdminTasksSection />
      </div>
    </>
  );
};

export default AdminPage;
