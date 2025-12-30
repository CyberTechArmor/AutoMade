import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Project, Client, ProjectMilestone, Session, ProjectStage, UpdateProjectInput } from '../types';

const STAGE_COLORS: Record<ProjectStage, string> = {
  discovery: 'bg-purple-100 text-purple-800',
  proposal: 'bg-blue-100 text-blue-800',
  contract: 'bg-indigo-100 text-indigo-800',
  development: 'bg-yellow-100 text-yellow-800',
  delivery: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const STAGES: ProjectStage[] = ['discovery', 'proposal', 'contract', 'development', 'delivery', 'maintenance', 'closed'];

interface ProjectDetails {
  project: Project;
  client: Client | null;
  milestones: ProjectMilestone[];
  recentSessions: Session[];
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'sessions'>('overview');
  const [editForm, setEditForm] = useState<UpdateProjectInput>({});

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await api.getProject(id!) as unknown as ProjectDetails;
      setData(response);
      setEditForm({
        name: response.project.name,
        description: response.project.description || '',
        stage: response.project.stage,
        repositoryUrl: response.project.repositoryUrl || '',
        documentationUrl: response.project.documentationUrl || '',
        productionUrl: response.project.productionUrl || '',
        stagingUrl: response.project.stagingUrl || '',
        estimatedHours: response.project.estimatedHours || undefined,
        actualHours: response.project.actualHours,
        notes: response.project.notes || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateProject(id!, editForm);
      setEditing(false);
      loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteProject(id!);
      navigate('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleStageChange = async (newStage: ProjectStage) => {
    try {
      await api.updateProject(id!, { stage: newStage });
      loadProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <Link to="/projects" className="btn btn-primary">
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  const { project, client, milestones, recentSessions } = data;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/projects" className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${STAGE_COLORS[project.stage]}`}>
                  {project.stage.replace('_', ' ')}
                </span>
              </div>
              {client && (
                <Link to={`/clients/${client.id}`} className="text-gray-600 hover:text-blue-600">
                  {client.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="btn btn-secondary">
                  Edit
                </button>
                <button onClick={handleDelete} className="btn btn-danger">
                  Delete
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(false)} className="btn btn-secondary" disabled={saving}>
                  Cancel
                </button>
                <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stage Pipeline */}
        <div className="card">
          <h2 className="text-sm font-medium text-gray-500 mb-4">Project Stage</h2>
          <div className="flex items-center gap-2">
            {STAGES.map((stage, index) => (
              <div key={stage} className="flex items-center">
                <button
                  onClick={() => handleStageChange(stage)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    project.stage === stage
                      ? STAGE_COLORS[stage]
                      : STAGES.indexOf(project.stage) > index
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
                {index < STAGES.length - 1 && (
                  <svg className="w-5 h-5 text-gray-300 mx-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            {(['overview', 'milestones', 'sessions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                {editing ? (
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="input"
                    rows={4}
                  />
                ) : (
                  <p className="text-gray-600">{project.description || 'No description'}</p>
                )}
              </div>

              {/* Overview */}
              {project.overview && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h2>
                  <div className="space-y-4">
                    {project.overview.problem && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Problem Statement</h3>
                        <p className="text-gray-600 mt-1">{project.overview.problem}</p>
                      </div>
                    )}
                    {project.overview.goals && project.overview.goals.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Goals</h3>
                        <ul className="mt-1 list-disc list-inside text-gray-600">
                          {project.overview.goals.map((goal, i) => (
                            <li key={i}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {project.overview.successCriteria && project.overview.successCriteria.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Success Criteria</h3>
                        <ul className="mt-1 list-disc list-inside text-gray-600">
                          {project.overview.successCriteria.map((criteria, i) => (
                            <li key={i}>{criteria}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Links</h2>
                {editing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Repository URL</label>
                      <input
                        type="url"
                        value={editForm.repositoryUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, repositoryUrl: e.target.value })}
                        className="input"
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div>
                      <label className="label">Documentation URL</label>
                      <input
                        type="url"
                        value={editForm.documentationUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, documentationUrl: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Production URL</label>
                      <input
                        type="url"
                        value={editForm.productionUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, productionUrl: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Staging URL</label>
                      <input
                        type="url"
                        value={editForm.stagingUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, stagingUrl: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {[
                      { label: 'Repository', url: project.repositoryUrl },
                      { label: 'Documentation', url: project.documentationUrl },
                      { label: 'Production', url: project.productionUrl },
                      { label: 'Staging', url: project.stagingUrl },
                    ].map(({ label, url }) => (
                      <div key={label}>
                        <span className="text-gray-500">{label}:</span>
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:text-blue-700">
                            {new URL(url).hostname}
                          </a>
                        ) : (
                          <span className="ml-2 text-gray-400">Not set</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Hours Logged</span>
                      <span className="font-medium">{project.actualHours}h</span>
                    </div>
                    {project.estimatedHours && (
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min((project.actualHours / project.estimatedHours) * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {project.estimatedHours && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Estimated Hours</span>
                      <span>{project.estimatedHours}h</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sessions</span>
                    <span>{recentSessions.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Milestones</span>
                    <span>{milestones.filter(m => m.completedDate).length}/{milestones.length}</span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  {project.startDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Started</span>
                      <span>{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {project.targetDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Target</span>
                      <span>{new Date(project.targetDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {project.completedDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Completed</span>
                      <span>{new Date(project.completedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h2>
            {milestones.length === 0 ? (
              <p className="text-gray-500">No milestones defined yet.</p>
            ) : (
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`p-4 rounded-lg border ${
                      milestone.completedDate ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{milestone.name}</h3>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                        )}
                      </div>
                      {milestone.completedDate ? (
                        <span className="text-green-600 text-sm font-medium">Completed</span>
                      ) : milestone.targetDate ? (
                        <span className="text-gray-500 text-sm">
                          Due {new Date(milestone.targetDate).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Discovery Sessions</h2>
              <Link to={`/sessions?projectId=${project.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>
            {recentSessions.length === 0 ? (
              <p className="text-gray-500">No sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{session.title}</h3>
                        <p className="text-sm text-gray-500 capitalize">{session.type} session</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.state === 'completed' ? 'bg-green-100 text-green-800' :
                        session.state === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.state.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
