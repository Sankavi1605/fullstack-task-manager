// client/src/pages/DashboardPage.jsx

import React from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar'; // <-- Import Navbar

const DashboardPage = () => {
  const { user } = useAuth(); // We get 'logout' from Navbar now

  return (
    <>
      <Navbar /> {/* <-- Use Navbar */}
      <main className="dashboard">
        <section className="dashboard-hero container">
          <h1>Welcome, {user?.username}!</h1>
          <p>Your current role: <span className="badge">{user?.role}</span></p>
          <p className="dashboard-lead">
            Keep track of tasks, team progress, and upcoming deadlines all in one place.
          </p>
        </section>

        <section className="dashboard-cards container">
          <article className="dashboard-card">
            <h3>Tasks Overview</h3>
            <p>View and manage the tasks assigned to you and your team.</p>
          </article>
          <article className="dashboard-card">
            <h3>Activity Feed</h3>
            <p>Stay informed about recent updates and status changes.</p>
          </article>
          <article className="dashboard-card">
            <h3>Quick Actions</h3>
            <p>Create tasks, assign teammates, and set priorities in seconds.</p>
          </article>
        </section>
      </main>
    </>
  );
};

export default DashboardPage;