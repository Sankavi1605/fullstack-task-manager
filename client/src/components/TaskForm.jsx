// client/src/components/TaskForm.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/*
  Props contract
  - onTaskAdded(formData: FormData): Promise<void>
  - onTaskUpdated(updated: { title, description, status, due_date }): Promise<void>
  - editingTask: task | null
  - setEditingTask: (task|null) => void
*/
const TaskForm = ({ onTaskAdded, onTaskUpdated, editingTask, setEditingTask, users = [] }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [dueDate, setDueDate] = useState(''); // YYYY-MM-DD
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const fileInputRef = useRef(null);

  // Populate fields in edit mode
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setStatus(editingTask.status || 'Pending');
      setDueDate(editingTask.due_date ? editingTask.due_date.split('T')[0] : '');
      setFile(null);
      setRequestMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      // reset when leaving edit mode
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTask?.task_id]);

  // Initialize default assignee to first user when users list changes (create mode)
  useEffect(() => {
    if (!editingTask && users && users.length > 0) {
      const firstUser = users.find((u) => u.role === 'USER') || users[0];
      if (firstUser) setAssigneeId(String(firstUser.user_id));
    }
  }, [users, editingTask]);

  const resetForm = () => {
  setTitle('');
  setDescription('');
  setStatus('Pending');
  setDueDate('');
  setFile(null);
  setAssigneeId('');
  setRequestMessage('');
  if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return; // minimal guard

    try {
      setSubmitting(true);
      if (editingTask) {
        // update flow
        const updateData = {
          status,
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate || null,
        };
        if (isUser && requestMessage.trim()) {
          updateData.requestMessage = requestMessage.trim();
        }
        await onTaskUpdated(updateData);
        resetForm();
      } else {
        // create flow (multipart/form-data)
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('status', status);
        if (dueDate) formData.append('due_date', dueDate);
        if (assigneeId) formData.append('assignee_id', assigneeId);
        if (file) formData.append('file', file);
        await onTaskAdded(formData);
        resetForm();
      }
    } finally {
      setSubmitting(false);
      if (editingTask) setEditingTask(null);
    }
  };

  const isEditing = Boolean(editingTask);

  const { user } = useAuth();
  const isUser = user && user.role === 'USER';
  return (
    <div className="task-form">
      <h3>{isEditing ? 'Edit Task' : 'Create a New Task'}</h3>
      <form onSubmit={handleSubmit}>
        {/* Only admins can assign */}
        {!isEditing && (
          <div className="form-group">
            <label htmlFor="assignee">Assign to</label>
            <select
              id="assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              required
            >
              {users
                .filter((u) => u.role === 'USER' || u.role === undefined)
                .map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Edit mode for users: only status and request message */}
        {isEditing && isUser ? (
          <>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="requestMessage">Request to admin (optional)</label>
              <textarea
                id="requestMessage"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Request admin to extend due date or add a note"
              />
            </div>
          </>
        ) : (
          <>
            {/* Title/desc/due only editable by admin, or in create mode */}
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isEditing && isUser}
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What needs to be done?"
                disabled={isEditing && isUser}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="dueDate">Due date</label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isEditing && isUser}
                />
              </div>
            </div>
            {/* Only admins can upload file in create mode */}
            {!isEditing && (
              <div className="form-group">
                <label htmlFor="file">Attachment (optional)</label>
                <input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files && e.target.files[0])}
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                />
              </div>
            )}
          </>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save changes' : 'Create task'}
          </button>
          {isEditing && (
            <button
              type="button"
              className="btn-back"
              onClick={() => {
                resetForm();
                setEditingTask(null);
              }}
            >
              Back
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
