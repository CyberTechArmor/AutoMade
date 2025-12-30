import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Session, Project, SessionState, SessionType, CreateSessionInput } from '../types';
import { Video, Mic, MessageSquare, Monitor, Bot, Plus, X, Filter, Clock, Calendar } from 'lucide-react';

const STATE_BADGES: Record<SessionState, string> = {
  scheduled: 'badge-info',
  pending: 'badge-warning',
  in_progress: 'badge-success',
  paused: 'badge-warning',
  completed: 'badge-neutral',
  cancelled: 'badge-error',
};

const TYPE_ICONS: Record<SessionType, React.ElementType> = {
  video: Video,
  voice: Mic,
  text: MessageSquare,
  hybrid: Monitor,
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
            <h1 className="text-2xl font-bold text-white">Discovery Sessions</h1>
            <p className="text-neon-text-secondary">LLM-facilitated client sessions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
            disabled={projects.length === 0}
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-neon-text-muted" />
            <span className="text-sm font-medium text-neon-text-secondary">Filters</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
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
            <div className="flex-1">
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
          <div className="p-4 bg-neon-error/10 border border-neon-error/20 rounded-lg text-neon-error flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-neon-cyan border-t-transparent" />
          </div>
        )}

        {/* Empty State */}
        {!loading && sessions.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-neon-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-neon-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No sessions yet</h3>
            <p className="text-neon-text-secondary mb-4">
              {projects.length === 0
                ? 'Create a project first, then start a discovery session.'
                : 'Start your first discovery session with a client.'}
            </p>
            {projects.length > 0 && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-accent">
                <Plus className="w-4 h-4 mr-2" />
                Start First Session
              </button>
            )}
          </div>
        )}

        {/* Sessions List */}
        {!loading && sessions.length > 0 && (
          <div className="space-y-4">
            {sessions.map((session) => {
              const TypeIcon = TYPE_ICONS[session.type];
              return (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="card block hover:border-neon-border-focus transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-neon-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-5 h-5 text-neon-cyan" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{session.title}</h3>
                        <p className="text-sm text-neon-text-muted">{getProjectName(session.projectId)}</p>
                        {session.description && (
                          <p className="text-sm text-neon-text-secondary mt-1 line-clamp-2">{session.description}</p>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${STATE_BADGES[session.state]}`}>
                      {session.state.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-neon-border text-sm text-neon-text-muted">
                    <span className="capitalize">{session.type} Session</span>
                    {session.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(session.duration)}
                      </span>
                    )}
                    {session.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.scheduledAt).toLocaleString()}
                      </span>
                    )}
                    {session.isAutonomous && (
                      <span className="flex items-center gap-1 text-neon-cyan">
                        <Bot className="w-4 h-4" />
                        AI Facilitated
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-neon-text-secondary">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} sessions
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="btn btn-secondary"
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

  const typeOptions: { value: SessionType; label: string; Icon: React.ElementType }[] = [
    { value: 'video', label: 'Video', Icon: Video },
    { value: 'voice', label: 'Voice', Icon: Mic },
    { value: 'text', label: 'Text', Icon: MessageSquare },
    { value: 'hybrid', label: 'Hybrid', Icon: Monitor },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal animate-scale-in max-w-lg">
        <div className="modal-header flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Start New Session</h2>
          <button onClick={onClose} className="text-neon-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body space-y-4">
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
              {typeOptions.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    type === value
                      ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                      : 'border-neon-border hover:border-neon-border-focus text-neon-text-secondary'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">{label}</span>
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
              className="rounded border-neon-border bg-neon-surface text-neon-cyan focus:ring-neon-cyan"
            />
            <label htmlFor="autonomous" className="text-sm text-neon-text-secondary flex items-center gap-2">
              <Bot className="w-4 h-4 text-neon-cyan" />
              AI-facilitated session (LLM will guide the conversation)
            </label>
          </div>
        </form>
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting || !title.trim()}>
            {submitting ? 'Creating...' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}
