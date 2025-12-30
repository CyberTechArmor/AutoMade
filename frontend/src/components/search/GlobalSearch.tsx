import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { SearchResult } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, JSX.Element> = {
  client: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  project: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  session: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const TYPE_COLORS: Record<string, string> = {
  client: 'text-blue-600 bg-blue-50',
  project: 'text-green-600 bg-green-50',
  session: 'text-purple-600 bg-purple-50',
  document: 'text-orange-600 bg-orange-50',
};

export default function GlobalSearch({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await api.search(query);
        setResults(response.data);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].url);
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [isOpen, results, selectedIndex, navigate, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl my-16 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 px-4">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients, projects, sessions, documents..."
              className="w-full px-4 py-4 text-lg border-0 focus:ring-0 focus:outline-none"
              autoFocus
            />
            {loading && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {results.length === 0 && query.trim() && !loading && (
              <div className="px-4 py-8 text-center text-gray-500">
                No results found for "{query}"
              </div>
            )}
            {results.map((result, index) => (
              <button
                key={result.id}
                className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  navigate(result.url);
                  onClose();
                }}
              >
                <div className={`p-2 rounded-lg ${TYPE_COLORS[result.type]}`}>
                  {TYPE_ICONS[result.type]}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{result.title}</div>
                  {result.description && (
                    <div className="text-sm text-gray-500 truncate">{result.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1 capitalize">{result.type}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400 flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd> to select</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
