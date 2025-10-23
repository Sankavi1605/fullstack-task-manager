// client/src/pages/DashboardPage.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import api from '../api/api';
import AdminTasksSection from '../components/AdminTasksSection';

const DashboardPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]); // for admin assignee selection
  const [editingTask, setEditingTask] = useState(null); // Holds the task object to edit
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Fetch Tasks Function ---
  const fetchTasks = async () => {
    try {
      setLoading(true);
      // We will add filters, search, and pagination later
      const res = await api.get('/tasks');
      setTasks(res.data.tasks || []); // Use res.data.tasks because of pagination
    } catch (err) {
      setError('Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  // --- Run fetchTasks on Component Load ---
  useEffect(() => {
    fetchTasks();
  }, []); // Empty dependency array means this runs once on load

  // --- Fetch Users (Admins only) ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (user?.role !== 'ADMIN') return;
        const res = await api.get('/admin/users');
        const onlyUsers = (res.data || []).filter((u) => u.role === 'USER');
        setUsers(onlyUsers);
      } catch (e) {
        // non-fatal; just leave list empty
        console.error('Failed to load users for assignee select', e);
      }
    };
    fetchUsers();
  }, [user?.role]);

  // --- Handler Functions ---

  // Called by TaskForm when creating a new task
  const handleAddTask = async (formData) => {
    try {
      const res = await api.post('/tasks', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Only append if the created task is assigned to current user; otherwise refetch "Your Tasks"
      if (res.data?.assignee_id === user.id) {
        setTasks([res.data, ...tasks]);
      } else {
        fetchTasks();
      }
    } catch (err) {
      setError('Failed to create task.');
    }
  };

  // Called by TaskForm when updating a task
  const handleUpdateTask = async (updatedTaskData) => {
    try {
      // Add the assignee_id (can't be changed in this form)
      const dataToUpdate = {
        ...updatedTaskData,
        assignee_id: editingTask.assignee_id,
      };

      const res = await api.put(`/tasks/${editingTask.task_id}`, dataToUpdate);
      
      // Find and replace the old task with the updated one
      setTasks(
        tasks.map((task) =>
          task.task_id === editingTask.task_id ? res.data : task
        )
      );
      setEditingTask(null); // Close the edit form
    } catch (err) {
      setError('Failed to update task.');
    }
  };

  // Called by TaskItem when delete button is clicked
  const handleDeleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.delete(`/tasks/${id}`);
        // Filter out the deleted task from the state
        setTasks(tasks.filter((task) => task.task_id !== id));
      } catch (err) {
        setError('Failed to delete task.');
      }
    }
  };

  // Called by TaskItem when edit button is clicked
  const handleEditTask = (task) => {
  console.log('handleEditTask called with:', task);
  setEditingTask(task);
  window.scrollTo(0, 0); // Scroll to top to see the form
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="dashboard-layout">
          <div className="task-form-container">
            {user?.role === 'ADMIN' ? (
              <>
                <TaskForm
                  onTaskAdded={handleAddTask}
                  onTaskUpdated={handleUpdateTask}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                  users={users}
                />
                {/* All Tasks table for admin, placed directly below the form */}
                <div style={{ marginTop: '2rem' }}>
                  <AdminTasksSection />
                </div>
              </>
            ) : editingTask ? (
              <TaskForm
                onTaskUpdated={handleUpdateTask}
                editingTask={editingTask}
                setEditingTask={setEditingTask}
              />
            ) : (
              <div className="task-form">
                <h3>Tasks are created by admins</h3>
                <p>You can view your tasks on the right and update their status.</p>
              </div>
            )}
          </div>
          {/* Remove the Your Tasks section for admin */}
          {user?.role !== 'ADMIN' && (
            <div className="task-list-container">
              <h2>Your Tasks</h2>
              {error && <p className="error-message">{error}</p>}
              {loading ? (
                <p>Loading tasks...</p>
              ) : (
                <TaskList
                  tasks={tasks}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardPage;