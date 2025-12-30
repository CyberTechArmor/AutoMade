import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Project, Document } from '../types';
import { FileText, Search, Filter } from 'lucide-react';

interface DocumentWithProject extends Document {
  projectName?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsResponse = await api.listProjects({ limit: 100 });
      setProjects(projectsResponse.data);

      // Load documents from all projects
      const allDocs: DocumentWithProject[] = [];
      for (const project of projectsResponse.data) {
        try {
          const docsResponse = await api.listDocuments(project.id, { limit: 100 });
          const docsWithProject = docsResponse.data.map(doc => ({
            ...doc,
            projectName: project.name,
          }));
          allDocs.push(...docsWithProject);
        } catch {
          // Skip projects without documents access
        }
      }
      setDocuments(allDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = !selectedProject || doc.projectId === selectedProject;
    const matchesType = !selectedType || doc.type === selectedType;
    return matchesSearch && matchesProject && matchesType;
  });

  const documentTypes = [...new Set(documents.map(d => d.type))];

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      discovery_summary: 'bg-blue-100 text-blue-800',
      requirements: 'bg-green-100 text-green-800',
      proposal: 'bg-purple-100 text-purple-800',
      contract: 'bg-orange-100 text-orange-800',
      report: 'bg-cyan-100 text-cyan-800',
      notes: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Documents</h1>
            <p className="text-neon-text-muted">All documents across your projects</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-text-muted" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neon-text-muted" />
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 text-neon-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No documents found</h3>
            <p className="text-neon-text-muted mb-4">
              {documents.length === 0
                ? 'Documents will appear here once created in projects.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <Link
                key={doc.id}
                to={`/projects/${doc.projectId}?tab=documents`}
                className="card hover:border-neon-cyan/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-neon-cyan/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{doc.title}</h3>
                    <p className="text-sm text-neon-text-muted truncate">{doc.projectName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(doc.type)}`}>
                    {doc.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-neon-text-muted">
                    v{doc.currentVersion}
                  </span>
                </div>
                {doc.description && (
                  <p className="mt-2 text-sm text-neon-text-secondary line-clamp-2">
                    {doc.description}
                  </p>
                )}
                <div className="mt-3 text-xs text-neon-text-muted">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
