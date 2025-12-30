import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Project, Session } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clients: 0,
    projects: 0,
    activeSessions: 0,
    completedSessions: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [clientsRes, projectsRes, sessionsRes] = await Promise.all([
        api.listClients({ limit: 1 }),
        api.listProjects({ limit: 5 }),
        api.listSessions({ limit: 5 }),
      ]);

      setStats({
        clients: clientsRes.pagination.total,
        projects: projectsRes.pagination.total,
        activeSessions: sessionsRes.data.filter((s) => s.state === 'in_progress').length,
        completedSessions: sessionsRes.data.filter((s) => s.state === 'completed').length,
      });
      setRecentProjects(projectsRes.data);
      setRecentSessions(sessionsRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const STAGE_COLORS: Record<string, string> = {
    discovery: 'bg-purple-100 text-purple-800',
    design: 'bg-blue-100 text-blue-800',
    development: 'bg-yellow-100 text-yellow-800',
    deployment: 'bg-orange-100 text-orange-800',
    operation: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    on_hold: 'bg-red-100 text-red-800',
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <h1 className="text-2xl font-bold">Welcome back, {user?.displayName}!</h1>
          <p className="text-blue-100 mt-1">
            Here's what's happening with your projects and clients.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/clients" className="card hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.clients}</p>
                <p className="text-gray-500 text-sm">Total Clients</p>
              </div>
            </div>
          </Link>

          <Link to="/projects" className="card hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.projects}</p>
                <p className="text-gray-500 text-sm">Active Projects</p>
              </div>
            </div>
          </Link>

          <Link to="/sessions?state=in_progress" className="card hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.activeSessions}</p>
                <p className="text-gray-500 text-sm">Active Sessions</p>
              </div>
            </div>
          </Link>

          <Link to="/sessions?state=completed" className="card hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '-' : stats.completedSessions}</p>
                <p className="text-gray-500 text-sm">Completed Sessions</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            to="/clients"
            className="card group border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Add New Client</p>
                <p className="text-sm text-gray-500">Create a new client organization</p>
              </div>
            </div>
          </Link>

          <Link
            to="/projects"
            className="card group border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Start New Project</p>
                <p className="text-sm text-gray-500">Begin a new client project</p>
              </div>
            </div>
          </Link>

          <Link
            to="/sessions"
            className="card group border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Start Discovery Session</p>
                <p className="text-sm text-gray-500">Launch an AI-facilitated session</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
              <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : recentProjects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        {project.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{project.description}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STAGE_COLORS[project.stage]}`}>
                        {project.stage.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
              <Link to="/sessions" className="text-sm text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : recentSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sessions yet</p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{session.title}</p>
                        <p className="text-sm text-gray-500 capitalize">{session.type} session</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.state === 'completed' ? 'bg-gray-100 text-gray-800' :
                        session.state === 'in_progress' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {session.state.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account & Security */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Security Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {user?.mfaEnabled
                ? 'Two-factor authentication is enabled on your account.'
                : 'Enhance your security by enabling two-factor authentication.'}
            </p>
            <Link to="/settings/security" className="btn btn-primary inline-block">
              {user?.mfaEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </Link>
          </div>

          {/* Account Info Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Account</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Role:</span> {user?.role}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">2FA:</span>{' '}
                {user?.mfaEnabled ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-yellow-600">Disabled</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
            </div>
            <div className="space-y-2">
              <Link to="/settings/security" className="block text-blue-600 hover:text-blue-700">
                Security Settings
              </Link>
              <Link to="/settings/password" className="block text-blue-600 hover:text-blue-700">
                Change Password
              </Link>
              <Link to="/clients" className="block text-blue-600 hover:text-blue-700">
                Manage Clients
              </Link>
              <Link to="/projects" className="block text-blue-600 hover:text-blue-700">
                View Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
