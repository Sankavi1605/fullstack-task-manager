import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { FaPencilAlt } from 'react-icons/fa';

const AdminTasksSection = () => {
	const [tasks, setTasks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetchTasks = async () => {
			try {
				setLoading(true);
				setError('');
				const res = await api.get('/admin/tasks');
				setTasks(res.data);
			} catch (err) {
				setError('Failed to fetch tasks.');
			} finally {
				setLoading(false);
			}
		};
		fetchTasks();
	}, []);

	const [editingDueId, setEditingDueId] = useState(null);
	const [dueInput, setDueInput] = useState("");

	const handleDueEdit = (task) => {
		setEditingDueId(task.task_id);
		const dateStr = task.due_date || '';
		setDueInput(dateStr);
	};

	const handleDueSave = async (task) => {
		try {
			const res = await api.put(`/tasks/${task.task_id}`, {
				title: task.title,
				description: task.description,
				status: task.status,
				assignee_id: task.assignee_id,
				due_date: dueInput,
				request_message: task.request_message || '',
			});

			const updatedTask = res.data; 
			setEditingDueId(null);
			setDueInput("");
			setTasks(prevTasks =>
				prevTasks.map(t =>
					t.task_id === updatedTask.task_id ? updatedTask : t
				)
			);
		} catch (err) {
			alert('Failed to update due date.');
		}
	};

	return (
		<section className="admin-section">
			<h2>All Tasks</h2>
			{error && <p className="error-message">{error}</p>}
			{loading ? (
				<p>Loading tasks...</p>
			) : (
				<div className="tasks-table-container" style={{ overflowX: 'auto', maxWidth: '1800px', margin: '0 auto' }}>
					<table className="tasks-table" style={{ minWidth: 1700, borderCollapse: 'collapse', width: '100%' }}>
						<thead>
							<tr style={{ background: 'rgba(255,255,255,0.04)' }}>
								<th style={{ padding: '10px 8px', textAlign: 'left' }}>ID</th>
								<th style={{ padding: '10px 8px', textAlign: 'left' }}>Title</th>
								<th style={{ padding: '10px 8px', textAlign: 'left' }}>Description</th>
								<th style={{ padding: '10px 8px', textAlign: 'left' }}>Status</th>
								<th style={{ padding: '10px 8px', textAlign: 'left' }}>Due Date</th>
								<th style={{ padding: '10px 8px', textAlign: 'left' }}>Assignee</th>
								<th style={{ padding: '10px 8px', textAlign: 'left' }}>Due Date Request</th>
							</tr>
						</thead>
						<tbody>
							{tasks.map((task) => (
								<tr key={task.task_id}>
									<td style={{ padding: '8px' }}>{task.task_id}</td>
									<td style={{ padding: '8px', fontWeight: 500 }}>{task.title}</td>
									<td style={{ padding: '8px', maxWidth: 220, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{task.description}</td>
									<td style={{ padding: '8px' }}>{task.status}</td>
									<td style={{ padding: '8px' }}>
										{editingDueId === task.task_id ? (
											<>
												<input
													type="date"
													value={dueInput}
													onChange={e => setDueInput(e.target.value)}
													style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #888' }}
												/>
												<button className="btn btn-small" style={{ marginLeft: 6 }} onClick={() => handleDueSave(task)}>Save</button>
												<button className="btn btn-small btn-danger" style={{ marginLeft: 4 }} onClick={() => setEditingDueId(null)}>Cancel</button>
											</>
										) : (
											<>
												{task.due_date ? task.due_date : 'N/A'}
												<button
													className="btn btn-icon"
													style={{ marginLeft: 8, padding: '2px 6px', background: 'none', border: 'none', cursor: 'pointer' }}
													title="Edit Due Date"
													onClick={() => handleDueEdit(task)}
												>
													<FaPencilAlt size={14} color="#ffd700" />
												</button>
											</>
										)}
									</td>
									<td style={{ padding: '8px' }}>{task.assignee_name}</td>
									<td style={{ padding: '8px', color: task.request_message ? '#ffd700' : '#aaa', fontStyle: task.request_message ? 'normal' : 'italic' }}>{task.request_message || '-'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
};

export default AdminTasksSection;