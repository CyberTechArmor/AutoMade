import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Client } from '../types';
import { Plus, Users, Building2, Mail, Calendar, ExternalLink, X } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadClients();
  }, [pagination.page]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await api.listClients({ page: pagination.page, limit: pagination.limit });
      setClients(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (data: { name: string; contactEmail?: string; contactName?: string; industry?: string }) => {
    try {
      await api.createClient(data);
      setShowCreateModal(false);
      loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Clients</h1>
            <p className="text-neon-text-secondary">Manage your client organizations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
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

        {/* Empty state */}
        {!loading && clients.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-neon-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-neon-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No clients yet</h3>
            <p className="text-neon-text-secondary mb-4">Get started by adding your first client organization.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-accent"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Client
            </button>
          </div>
        )}

        {/* Clients List */}
        {!loading && clients.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Industry</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neon-surface-hover rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-neon-text-secondary" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{client.name}</div>
                          {client.description && (
                            <div className="text-sm text-neon-text-muted truncate max-w-xs">{client.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {client.contactName || client.contactEmail ? (
                        <div>
                          <div className="text-white">{client.contactName || '-'}</div>
                          {client.contactEmail && (
                            <div className="text-sm text-neon-text-muted flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {client.contactEmail}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-neon-text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {client.industry ? (
                        <span className="badge badge-neutral">{client.industry}</span>
                      ) : (
                        <span className="text-neon-text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-neon-text-secondary text-sm">
                        <Calendar className="w-3 h-3" />
                        {new Date(client.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="text-right">
                      <Link
                        to={`/clients/${client.id}`}
                        className="btn btn-ghost btn-sm inline-flex items-center gap-1"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-neon-text-secondary">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} clients
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

      {/* Create Client Modal */}
      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateClient}
        />
      )}
    </Layout>
  );
}

function CreateClientModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; contactEmail?: string; contactName?: string; industry?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    await onCreate({
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      industry: industry.trim() || undefined,
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal animate-scale-in">
        <div className="modal-header flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Add New Client</h2>
          <button onClick={onClose} className="text-neon-text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div>
            <label className="label">Client Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Acme Corporation"
              required
            />
          </div>
          <div>
            <label className="label">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="input"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="label">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="input"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="label">Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="input"
              placeholder="Technology"
            />
          </div>
        </form>
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={submitting || !name.trim()}
          >
            {submitting ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
