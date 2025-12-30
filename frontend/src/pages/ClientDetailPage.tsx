import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Client, Project } from '../types';

interface ClientDetails {
  client: Client;
  projects: Project[];
  projectCount: number;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    industry: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadClient();
    }
  }, [id]);

  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await api.getClient(id!) as unknown as ClientDetails;
      setData(response);
      setEditForm({
        name: response.client.name,
        description: response.client.description || '',
        contactName: response.client.contactName || '',
        contactEmail: response.client.contactEmail || '',
        contactPhone: response.client.contactPhone || '',
        website: response.client.website || '',
        industry: response.client.industry || '',
        notes: response.client.notes || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateClient(id!, {
        name: editForm.name,
        description: editForm.description || undefined,
        contactName: editForm.contactName || undefined,
        contactEmail: editForm.contactEmail || undefined,
        contactPhone: editForm.contactPhone || undefined,
        website: editForm.website || undefined,
        industry: editForm.industry || undefined,
        notes: editForm.notes || undefined,
      });
      setEditing(false);
      loadClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return;
    }
    try {
      await api.deleteClient(id!);
      navigate('/clients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
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
          <p className="text-red-600 mb-4">{error || 'Client not found'}</p>
          <Link to="/clients" className="btn btn-primary">
            Back to Clients
          </Link>
        </div>
      </Layout>
    );
  }

  const { client, projects } = data;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/clients" className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              {client.industry && (
                <p className="text-gray-600">{client.industry}</p>
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Client Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info Card */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="label">Name *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="input"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Industry</label>
                      <input
                        type="text"
                        value={editForm.industry}
                        onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Website</label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        className="input"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.description && (
                    <p className="text-gray-600">{client.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Industry:</span>
                      <span className="ml-2 text-gray-900">{client.industry || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Website:</span>
                      {client.website ? (
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-700"
                        >
                          {client.website}
                        </a>
                      ) : (
                        <span className="ml-2 text-gray-900">-</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Card */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Contact Name</label>
                    <input
                      type="text"
                      value={editForm.contactName}
                      onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Contact Email</label>
                    <input
                      type="email"
                      value={editForm.contactEmail}
                      onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      type="tel"
                      value={editForm.contactPhone}
                      onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 text-gray-900">{client.contactName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    {client.contactEmail ? (
                      <a href={`mailto:${client.contactEmail}`} className="ml-2 text-blue-600 hover:text-blue-700">
                        {client.contactEmail}
                      </a>
                    ) : (
                      <span className="ml-2 text-gray-900">-</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 text-gray-900">{client.contactPhone || '-'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              {editing ? (
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="Internal notes about this client..."
                />
              ) : (
                <p className="text-gray-600">{client.notes || 'No notes'}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Projects</span>
                  <span className="font-medium text-gray-900">{projects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900">{new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-gray-900">{new Date(client.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Projects */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
                <Link
                  to={`/projects?clientId=${client.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All
                </Link>
              </div>
              {projects.length === 0 ? (
                <p className="text-gray-500 text-sm">No projects yet</p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{project.name}</div>
                      <div className="text-sm text-gray-500 capitalize">{project.stage}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
