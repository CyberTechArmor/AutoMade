import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Project, Client, ProjectStage } from '../types';

const STAGES: { value: ProjectStage | ''; label: string }[] = [
  { value: '', label: 'All Stages' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'design', label: 'Design' },
  { value: 'development', label: 'Development' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'operation', label: 'Operation' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const STAGE_COLORS: Record<ProjectStage, string> = {
  discovery: 'bg-purple-100 text-purple-800',
  design: 'bg-blue-100 text-blue-800',
  development: 'bg-yellow-100 text-yellow-800',
  deployment: 'bg-orange-100 text-orange-800',
  operation: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-red-100 text-red-800',
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
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">Manage your project lifecycle</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            disabled={clients.length === 0}
          >
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex gap-4">
            <div>
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
            <div>
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
        {!loading && projects.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">
              {clients.length === 0
                ? 'Create a client first, then start a new project.'
                : 'Get started by creating your first project.'}
            </p>
            {clients.length > 0 && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                Create First Project
              </button>
            )}
          </div>
        )}

        {/* Projects Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="card hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STAGE_COLORS[project.stage]}`}>
                    {project.stage.replace('_', ' ')}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  <span>{getClientName(project.clientId)}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
                  <span className="text-gray-500">
                    {project.actualHours > 0 ? `${project.actualHours}h logged` : 'No time logged'}
                  </span>
                  {project.targetDate && (
                    <span className="text-gray-500">
                      Due {new Date(project.targetDate).toLocaleDateString()}
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
              {pagination.total} projects
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
