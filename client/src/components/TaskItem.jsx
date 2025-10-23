// client/src/components/TaskItem.jsx

import React from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const TaskItem = ({ task, onEdit, onDelete }) => {
  const { user } = useAuth();
  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'status-pending';
      case 'In Progress':
        return 'status-in-progress';
      case 'Completed':
        return 'status-completed';
      default:
        return '';
    }
  };

  // Create the full URL for the file
  const fileUrl = task.file_path ? `${api.defaults.baseURL.replace('/api', '')}/${task.file_path}` : null;

  // Only allow edit for users if not completed, and only allow delete if completed
  const isUser = user && user.role === 'USER';
  const canEdit = isUser ? task.status !== 'Completed' : true;
  const canDelete = isUser ? task.status === 'Completed' : true;

  return (
    <div className="task-item">
      <div className="task-header">
        <h3>{task.title}</h3>
        <span className={`task-status ${getStatusClass(task.status)}`}>
          {task.status}
        </span>
      </div>
      <p className="task-description">{task.description}</p>
      <div className="task-footer">
        <div>
          <strong>Assignee:</strong> {task.assignee_name}
        </div>
        <div>
          <strong>Due:</strong> {task.due_date ? task.due_date.split('T')[0] : 'N/A'}
        </div>
      </div>
      {fileUrl && (
        <div className="task-file">
          <strong>Attachment:</strong>{' '}
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            {task.file_path.split('-').pop()}
          </a>
        </div>
      )}
      <div className="task-actions">
        {canEdit && (
          <button className="btn btn-small" onClick={() => onEdit(task)}>
            Edit
          </button>
        )}
        {canDelete && (
          <button className="btn btn-small btn-danger" onClick={() => onDelete(task.task_id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskItem;