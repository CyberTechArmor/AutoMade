import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Project, Session } from '../types';
import {
  Users,
  FolderKanban,
  Video,
  CheckCircle,
  Plus,
  Shield,
  User,
  Zap,
  ArrowRight,
} from 'lucide-react';

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

  const STAGE_BADGES: Record<string, string> = {
    discovery: 'badge-info',
    proposal: 'badge-info',
    contract: 'badge-warning',
    development: 'badge-warning',
    delivery: 'badge-success',
    maintenance: 'badge-success',
    closed: 'badge-neutral',
  };

  const SESSION_BADGES: Record<string, string> = {
    scheduled: 'badge-info',
    pending: 'badge-warning',
    in_progress: 'badge-success',
    completed: 'badge-neutral',
    cancelled: 'badge-error',
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="card bg-gradient-to-r from-neon-cyan to-blue-600 border-0">
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.displayName || 'User'}!</h1>
          <p className="text-blue-100 mt-1">
            Here's what's happening with your projects and clients.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/clients" className="card hover:border-neon-border-focus transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neon-cyan/20 rounded-xl flex items-center justify-center group-hover:bg-neon-cyan/30 transition-colors">
                <Users className="w-6 h-6 text-neon-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{loading ? '-' : stats.clients}</p>
                <p className="text-neon-text-secondary text-sm">Total Clients</p>
              </div>
            </div>
          </Link>

          <Link to="/projects" className="card hover:border-neon-border-focus transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <FolderKanban className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{loading ? '-' : stats.projects}</p>
                <p className="text-neon-text-secondary text-sm">Active Projects</p>
              </div>
            </div>
          </Link>

          <Link to="/sessions?state=in_progress" className="card hover:border-neon-border-focus transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neon-success/20 rounded-xl flex items-center justify-center group-hover:bg-neon-success/30 transition-colors">
                <Video className="w-6 h-6 text-neon-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{loading ? '-' : stats.activeSessions}</p>
                <p className="text-neon-text-secondary text-sm">Active Sessions</p>
              </div>
            </div>
          </Link>

          <Link to="/sessions?state=completed" className="card hover:border-neon-border-focus transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neon-text-muted/20 rounded-xl flex items-center justify-center group-hover:bg-neon-text-muted/30 transition-colors">
                <CheckCircle className="w-6 h-6 text-neon-text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{loading ? '-' : stats.completedSessions}</p>
                <p className="text-neon-text-secondary text-sm">Completed Sessions</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            to="/clients"
            className="card group border-dashed hover:border-neon-cyan hover:bg-neon-cyan/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-surface-hover group-hover:bg-neon-cyan/20 rounded-lg flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-neon-text-secondary group-hover:text-neon-cyan" />
              </div>
              <div>
                <p className="font-medium text-white">Add New Client</p>
                <p className="text-sm text-neon-text-muted">Create a new client organization</p>
              </div>
            </div>
          </Link>

          <Link
            to="/projects"
            className="card group border-dashed hover:border-neon-cyan hover:bg-neon-cyan/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-surface-hover group-hover:bg-neon-cyan/20 rounded-lg flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-neon-text-secondary group-hover:text-neon-cyan" />
              </div>
              <div>
                <p className="font-medium text-white">Start New Project</p>
                <p className="text-sm text-neon-text-muted">Begin a new client project</p>
              </div>
            </div>
          </Link>

          <Link
            to="/sessions"
            className="card group border-dashed hover:border-neon-cyan hover:bg-neon-cyan/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-surface-hover group-hover:bg-neon-cyan/20 rounded-lg flex items-center justify-center transition-colors">
                <Video className="w-5 h-5 text-neon-text-secondary group-hover:text-neon-cyan" />
              </div>
              <div>
                <p className="font-medium text-white">Start Discovery Session</p>
                <p className="text-sm text-neon-text-muted">Launch an AI-facilitated session</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
              <Link to="/projects" className="text-sm text-neon-cyan hover:text-blue-400 flex items-center gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-neon-cyan border-t-transparent" />
              </div>
            ) : recentProjects.length === 0 ? (
              <p className="text-neon-text-muted text-center py-8">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 rounded-lg border border-neon-border hover:border-neon-border-focus hover:bg-neon-surface-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{project.name}</p>
                        {project.description && (
                          <p className="text-sm text-neon-text-muted truncate max-w-xs">{project.description}</p>
                        )}
                      </div>
                      <span className={`badge ${STAGE_BADGES[project.stage] || 'badge-neutral'}`}>
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
              <h2 className="text-lg font-semibold text-white">Recent Sessions</h2>
              <Link to="/sessions" className="text-sm text-neon-cyan hover:text-blue-400 flex items-center gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-neon-cyan border-t-transparent" />
              </div>
            ) : recentSessions.length === 0 ? (
              <p className="text-neon-text-muted text-center py-8">No sessions yet</p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="block p-3 rounded-lg border border-neon-border hover:border-neon-border-focus hover:bg-neon-surface-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neon-surface-hover rounded-lg flex items-center justify-center">
                          <Video className="w-4 h-4 text-neon-text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{session.title}</p>
                          <p className="text-sm text-neon-text-muted capitalize">{session.type} session</p>
                        </div>
                      </div>
                      <span className={`badge ${SESSION_BADGES[session.state] || 'badge-neutral'}`}>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Security Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-neon-cyan/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-neon-cyan" />
              </div>
              <h3 className="text-lg font-semibold text-white">Security</h3>
            </div>
            <p className="text-neon-text-secondary mb-4">
              {user?.mfaEnabled
                ? 'Two-factor authentication is enabled on your account.'
                : 'Enhance your security by enabling two-factor authentication.'}
            </p>
            <Link to="/settings/security" className="btn btn-accent inline-block">
              {user?.mfaEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </Link>
          </div>

          {/* Account Info Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-neon-success/20 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-neon-success" />
              </div>
              <h3 className="text-lg font-semibold text-white">Account</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-neon-text-secondary">
                <span className="text-neon-text-muted">Email:</span>{' '}
                <span className="text-white">{user?.email}</span>
              </p>
              <p className="text-neon-text-secondary">
                <span className="text-neon-text-muted">Role:</span>{' '}
                <span className="text-white capitalize">{user?.role}</span>
              </p>
              <p className="text-neon-text-secondary">
                <span className="text-neon-text-muted">2FA:</span>{' '}
                {user?.mfaEnabled ? (
                  <span className="text-neon-success">Enabled</span>
                ) : (
                  <span className="text-neon-warning">Disabled</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Links Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            </div>
            <div className="space-y-2">
              <Link to="/settings/security" className="block text-neon-cyan hover:text-blue-400">
                Security Settings
              </Link>
              <Link to="/clients" className="block text-neon-cyan hover:text-blue-400">
                Manage Clients
              </Link>
              <Link to="/projects" className="block text-neon-cyan hover:text-blue-400">
                View Projects
              </Link>
              <Link to="/sessions" className="block text-neon-cyan hover:text-blue-400">
                Discovery Sessions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
