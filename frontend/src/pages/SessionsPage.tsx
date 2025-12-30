import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Session, Project, SessionState, SessionType, CreateSessionInput } from '../types';

const STATE_COLORS: Record<SessionState, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const TYPE_ICONS: Record<SessionType, string> = {
  video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  voice: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  text: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
  hybrid: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
};

export default function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const projectIdFilter = searchParams.get('projectId') || '';
  const stateFilter = searchParams.get('state') || '';

  useEffect(() => {
    loadData();
  }, [pagination.page, projectIdFilter, stateFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, projectsRes] = await Promise.all([
        api.listSessions({
          page: pagination.page,
          limit: pagination.limit,
          projectId: projectIdFilter || undefined,
          state: stateFilter || undefined,
        }),
        api.listProjects({ limit: 100 }),
      ]);
      setSessions(sessionsRes.data);
      setPagination(sessionsRes.pagination);
      setProjects(projectsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (data: CreateSessionInput) => {
    try {
      const session = await api.createSession(data);
      setShowCreateModal(false);
      // Navigate to the new session
      window.location.href = `/sessions/${session.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || 'Unknown';
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discovery Sessions</h1>
            <p className="text-gray-600">LLM-facilitated client sessions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            disabled={projects.length === 0}
          >
            New Session
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex gap-4">
            <div>
              <label className="label">Project</label>
              <select
                value={projectIdFilter}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                className="input"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={stateFilter}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!loading && sessions.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICONS.video} />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-4">
              {projects.length === 0
                ? 'Create a project first, then start a discovery session.'
                : 'Start your first discovery session with a client.'}
            </p>
            {projects.length > 0 && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                Start First Session
              </button>
            )}
          </div>
        )}

        {/* Sessions List */}
        {!loading && sessions.length > 0 && (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="card block hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICONS[session.type]} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{session.title}</h3>
                      <p className="text-sm text-gray-500">{getProjectName(session.projectId)}</p>
                      {session.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{session.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATE_COLORS[session.state]}`}>
                      {session.state.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                  <span className="capitalize">{session.type} Session</span>
                  {session.duration && <span>{formatDuration(session.duration)}</span>}
                  {session.scheduledAt && (
                    <span>
                      {new Date(session.scheduledAt).toLocaleString()}
                    </span>
                  )}
                  {session.isAutonomous && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      AI Facilitated
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} sessions
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="btn btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSessionModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSession}
        />
      )}
    </Layout>
  );
}

function CreateSessionModal({
  projects,
  onClose,
  onCreate,
}: {
  projects: Project[];
  onClose: () => void;
  onCreate: (data: CreateSessionInput) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<SessionType>('video');
  const [isAutonomous, setIsAutonomous] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setSubmitting(true);
    await onCreate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      isAutonomous,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Start New Session</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Project *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input"
              required
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Session Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Initial Discovery Call"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={3}
              placeholder="Purpose of this session..."
            />
          </div>
          <div>
            <label className="label">Session Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['video', 'voice', 'text', 'hybrid'] as SessionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    type === t
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICONS[t]} />
                  </svg>
                  <span className="text-xs capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autonomous"
              checked={isAutonomous}
              onChange={(e) => setIsAutonomous(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autonomous" className="text-sm text-gray-700">
              AI-facilitated session (LLM will guide the conversation)
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting || !title.trim()}>
              {submitting ? 'Creating...' : 'Start Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
