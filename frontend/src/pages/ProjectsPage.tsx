import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Project, Client, ProjectStage } from '../types';
import { Plus, FolderKanban, Clock, Calendar, X, Filter } from 'lucide-react';

const STAGES: { value: ProjectStage | ''; label: string }[] = [
  { value: '', label: 'All Stages' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'contract', label: 'Contract' },
  { value: 'development', label: 'Development' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'closed', label: 'Closed' },
];

const STAGE_BADGES: Record<ProjectStage, string> = {
  discovery: 'badge-info',
  proposal: 'badge-info',
  contract: 'badge-warning',
  development: 'badge-warning',
  delivery: 'badge-success',
  maintenance: 'badge-success',
  closed: 'badge-neutral',
};

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const clientIdFilter = searchParams.get('clientId') || '';
  const stageFilter = searchParams.get('stage') || '';

  useEffect(() => {
    loadData();
  }, [pagination.page, clientIdFilter, stageFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, clientsRes] = await Promise.all([
        api.listProjects({
          page: pagination.page,
          limit: pagination.limit,
          clientId: clientIdFilter || undefined,
          stage: stageFilter || undefined,
        }),
        api.listClients({ limit: 100 }),
      ]);
      setProjects(projectsRes.data);
      setPagination(projectsRes.pagination);
      setClients(clientsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (data: { clientId: string; name: string; description?: string; stage?: ProjectStage }) => {
    try {
      await api.createProject(data);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
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

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client?.name || 'Unknown';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-neon-text-secondary">Manage your project lifecycle</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
            disabled={clients.length === 0}
          >
            <Plus className="w-4 h-4" />
            New Project
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
              <label className="label">Client</label>
              <select
                value={clientIdFilter}
                onChange={(e) => handleFilterChange('clientId', e.target.value)}
                className="input"
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
                className="input"
              >
                {STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
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
        {!loading && projects.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-neon-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-neon-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-neon-text-secondary mb-4">
              {clients.length === 0
                ? 'Create a client first, then start a new project.'
                : 'Get started by creating your first project.'}
            </p>
            {clients.length > 0 && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-accent">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </button>
            )}
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="card hover:border-neon-border-focus transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white truncate group-hover:text-neon-cyan transition-colors">
                    {project.name}
                  </h3>
                  <span className={`badge ${STAGE_BADGES[project.stage]}`}>
                    {project.stage.replace('_', ' ')}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-neon-text-muted mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="text-sm text-neon-text-secondary">
                  <span>{getClientName(project.clientId)}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-neon-border text-sm">
                  <div className="flex items-center gap-1 text-neon-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{project.actualHours > 0 ? `${project.actualHours}h` : 'No time'}</span>
                  </div>
                  {project.targetDate && (
                    <div className="flex items-center gap-1 text-neon-text-muted">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(project.targetDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-neon-text-secondary">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} projects
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
        <CreateProjectModal
          clients={clients}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </Layout>
  );
}

function CreateProjectModal({
  clients,
  onClose,
  onCreate,
}: {
  clients: Client[];
  onClose: () => void;
  onCreate: (data: { clientId: string; name: string; description?: string; stage?: ProjectStage }) => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<ProjectStage>('discovery');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientId) return;

    setSubmitting(true);
    await onCreate({
      clientId,
      name: name.trim(),
      description: description.trim() || undefined,
      stage,
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal animate-scale-in">
        <div className="modal-header flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create New Project</h2>
          <button onClick={onClose} className="text-neon-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div>
            <label className="label">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input"
              required
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Website Redesign"
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
              placeholder="Brief project description..."
            />
          </div>
          <div>
            <label className="label">Initial Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as ProjectStage)}
              className="input"
            >
              {STAGES.slice(1).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </form>
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting || !name.trim()}>
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
