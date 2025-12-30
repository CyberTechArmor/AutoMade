import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Document, DocumentType, DocumentState, CreateDocumentInput } from '../../types';

interface Props {
  projectId: string;
}

const TYPE_COLORS: Record<DocumentType, string> = {
  proposal: 'bg-purple-100 text-purple-800',
  contract: 'bg-blue-100 text-blue-800',
  specification: 'bg-indigo-100 text-indigo-800',
  report: 'bg-yellow-100 text-yellow-800',
  notes: 'bg-gray-100 text-gray-800',
  other: 'bg-gray-100 text-gray-600',
};

const STATE_COLORS: Record<DocumentState, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  published: 'bg-blue-100 text-blue-800',
  archived: 'bg-red-100 text-red-800',
};

const DOCUMENT_TYPES: DocumentType[] = ['proposal', 'contract', 'specification', 'report', 'notes', 'other'];

export default function DocumentsList({ projectId }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDoc, setNewDoc] = useState<CreateDocumentInput>({
    title: '',
    type: 'notes',
    content: '',
    description: '',
  });

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.listDocuments(projectId);
      setDocuments(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      await api.createDocument(projectId, newDoc);
      setShowCreateModal(false);
      setNewDoc({ title: '', type: 'notes', content: '', description: '' });
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    try {
      await api.deleteDocument(projectId, docId);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          New Document
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documents yet. Create your first document to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/projects/${projectId}/documents/${doc.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {doc.title}
                    </Link>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[doc.type]}`}>
                      {doc.type}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATE_COLORS[doc.state]}`}>
                      {doc.state}
                    </span>
                    {doc.clientVisible && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Client Visible
                      </span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    Version {doc.currentVersion} · Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-gray-400 hover:text-red-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Document</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="input"
                  placeholder="Document title"
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  value={newDoc.type}
                  onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as DocumentType })}
                  className="input"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  type="text"
                  value={newDoc.description || ''}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  className="input"
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  className="input"
                  rows={6}
                  placeholder="Document content (Markdown supported)"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="clientVisible"
                  checked={newDoc.clientVisible || false}
                  onChange={(e) => setNewDoc({ ...newDoc, clientVisible: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="clientVisible" className="text-sm text-gray-700">
                  Visible to client
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="btn btn-primary"
                disabled={creating || !newDoc.title || !newDoc.content}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
