// client/src/components/TaskForm.jsx

import React, { useState, useEffect } from 'react';
import api from '../api/api';

const TaskForm = ({ onTaskAdded, onTaskUpdated, editingTask, setEditingTask }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  // When 'editingTask' prop changes, fill the form with its data
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setStatus(editingTask.status);
      // Format the date for the input field (yyyy-MM-dd)
      setDueDate(editingTask.due_date ? editingTask.due_date.split('T')[0] : '');
    } else {
      // Clear form if we're not editing
      clearForm();
    }
  }, [editingTask]);

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setStatus('Pending');
    setDueDate('');
    setFile(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // We use FormData because we are sending a file
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('status', status);
    formData.append('due_date', dueDate);
    // TODO: We need a way to select an assignee.
    // For now, we'll hardcode the current user in the dashboard.
    // We will pass the 'assignee_id' in the onTaskAdded/onTaskUpdated functions.

    if (file) {
      formData.append('file', file);
    }

    try {
      if (editingTask) {
        // --- UPDATE TASK ---
        // We'll update the task in the DashboardPage,
        // since file uploads make PUT requests with FormData tricky.
        // For now, let's just use JSON.
        const updatedTaskData = {
          title,
          description,
          status,
          due_date: dueDate,
          // We'll add assignee_id in the parent component
        };
        onTaskUpdated(updatedTaskData);

      } else {
        // --- CREATE TASK ---
        // We call the 'onTaskAdded' prop (a function)
        // passed down from the DashboardPage.
        onTaskAdded(formData);
      }
      clearForm();
      
    } catch (err) {
      setError(err.response?.data?.message || (editingTask ? 'Update failed' : 'Creation failed'));
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
      {error && <p className="error-message">{error}</p>}
      
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="due-date">Due Date</label>
          <input
            id="due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="file">Attach File (Optional)</label>
        <input
          id="file"
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn">
          {editingTask ? 'Update Task' : 'Add Task'}
        </button>
        {editingTask && (
          <button type="button" className="btn btn-secondary" onClick={() => setEditingTask(null)}>
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
};

export default TaskForm;