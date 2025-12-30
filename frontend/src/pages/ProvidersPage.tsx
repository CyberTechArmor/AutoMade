import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Provider, CreateProviderInput } from '../types';
import { Key, Plus, Eye, EyeOff, RefreshCw, Trash2, Check, AlertCircle } from 'lucide-react';

const PROVIDER_INFO: Record<string, {
  displayName: string;
  description: string;
  docsUrl: string;
  type: Provider['type'];
  service: string;
}> = {
  anthropic: {
    displayName: 'Anthropic (Claude)',
    description: 'AI language model for session facilitation',
    docsUrl: 'https://console.anthropic.com/',
    type: 'llm',
    service: 'claude',
  },
  openai: {
    displayName: 'OpenAI',
    description: 'GPT models for AI processing',
    docsUrl: 'https://platform.openai.com/',
    type: 'llm',
    service: 'openai',
  },
  elevenlabs: {
    displayName: 'ElevenLabs',
    description: 'Voice synthesis for AI agents',
    docsUrl: 'https://elevenlabs.io/',
    type: 'voice',
    service: 'elevenlabs',
  },
  livekit: {
    displayName: 'LiveKit',
    description: 'Real-time video/audio communication',
    docsUrl: 'https://livekit.io/',
    type: 'webrtc',
    service: 'livekit',
  },
  twilio: {
    displayName: 'Twilio',
    description: 'SMS and voice communication',
    docsUrl: 'https://www.twilio.com/',
    type: 'sms',
    service: 'twilio',
  },
  google: {
    displayName: 'Google Cloud',
    description: 'Speech-to-text and other AI services',
    docsUrl: 'https://console.cloud.google.com/',
    type: 'transcription',
    service: 'google-speech',
  },
};

interface ProviderFormData {
  apiKey: string;
  config: Record<string, string>;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<ProviderFormData>({
    apiKey: '',
    config: {},
  });
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await api.listProviders();
      setProviders(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = async () => {
    if (!selectedProvider || !formData.apiKey) return;

    const providerInfo = PROVIDER_INFO[selectedProvider];
    if (!providerInfo) return;

    setSaving(true);
    try {
      const createData: CreateProviderInput = {
        name: selectedProvider,
        type: providerInfo.type,
        service: providerInfo.service,
        credentials: { apiKey: formData.apiKey, ...formData.config },
        config: {},
      };
      const newProvider = await api.createProvider(createData);
      setProviders(prev => [...prev, newProvider]);
      setShowAddModal(false);
      setSelectedProvider('');
      setFormData({ apiKey: '', config: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add provider');
    } finally {
      setSaving(false);
    }
  };

  const handleRotateKey = async (providerId: string) => {
    const newKey = window.prompt('Enter new API key:');
    if (!newKey) return;

    try {
      await api.rotateProviderKey(providerId, newKey);
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate key');
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!window.confirm('Are you sure you want to delete this provider configuration?')) return;

    try {
      await api.deleteProvider(providerId);
      setProviders(prev => prev.filter(p => p.id !== providerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      await api.testProvider(providerId);
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Provider test failed');
    } finally {
      setTestingProvider(null);
    }
  };

  const toggleShowKey = (providerId: string) => {
    setShowKey(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const maskKey = (key: string) => {
    if (!key || key.length <= 8) return '********';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  const availableProviders = Object.keys(PROVIDER_INFO).filter(
    name => !providers.some(p => p.name === name)
  );

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">API Providers</h1>
            <p className="text-neon-text-muted">Manage your AI and communication service API keys</p>
          </div>
          {availableProviders.length > 0 && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              &times;
            </button>
          </div>
        )}

        {/* Provider List */}
        <div className="space-y-4">
          {providers.length === 0 ? (
            <div className="card text-center py-12">
              <Key className="w-12 h-12 text-neon-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No providers configured</h3>
              <p className="text-neon-text-muted mb-4">
                Add your first API provider to enable AI features.
              </p>
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </button>
            </div>
          ) : (
            providers.map((provider) => {
              const info = PROVIDER_INFO[provider.name] || {
                displayName: provider.name,
                description: provider.service,
                docsUrl: ''
              };
              const isActive = provider.status === 'active' || provider.enabled;
              return (
                <div key={provider.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-green-500/10' : 'bg-yellow-500/10'
                      }`}>
                        <Key className={`w-6 h-6 ${
                          isActive ? 'text-green-400' : 'text-yellow-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{info.displayName}</h3>
                        <p className="text-sm text-neon-text-muted">{info.description}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neon-text-muted">API Key:</span>
                            <code className="text-xs bg-neon-surface-hover px-2 py-1 rounded">
                              {showKey[provider.id] ? provider.apiKeyHash : maskKey(provider.apiKeyHash || '')}
                            </code>
                            <button
                              onClick={() => toggleShowKey(provider.id)}
                              className="text-neon-text-muted hover:text-white"
                            >
                              {showKey[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <span className={`flex items-center gap-1 text-xs ${
                            isActive ? 'text-green-400' : 'text-yellow-400'
                          }`}>
                            {isActive ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {provider.status || (provider.enabled ? 'active' : 'inactive')}
                          </span>
                        </div>
                        {provider.lastUsedAt && (
                          <p className="mt-1 text-xs text-neon-text-muted">
                            Last used: {new Date(provider.lastUsedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestProvider(provider.id)}
                        className="btn btn-secondary btn-sm"
                        disabled={testingProvider === provider.id}
                      >
                        {testingProvider === provider.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Test
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRotateKey(provider.id)}
                        className="btn btn-secondary btn-sm"
                        title="Rotate API Key"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Provider"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Provider Modal */}
        {showAddModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAddModal(false)} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="card w-full max-w-md animate-scale-in">
                <h2 className="text-xl font-bold text-white mb-4">Add Provider</h2>

                <div className="space-y-4">
                  <div>
                    <label className="label">Provider</label>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select a provider...</option>
                      {availableProviders.map(name => (
                        <option key={name} value={name}>
                          {PROVIDER_INFO[name]?.displayName || name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProvider && (
                    <>
                      <div className="p-3 bg-neon-surface-hover rounded-lg">
                        <p className="text-sm text-neon-text-secondary">
                          {PROVIDER_INFO[selectedProvider]?.description}
                        </p>
                        <a
                          href={PROVIDER_INFO[selectedProvider]?.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-neon-cyan hover:underline"
                        >
                          Get API key &rarr;
                        </a>
                      </div>

                      <div>
                        <label className="label">API Key</label>
                        <input
                          type="password"
                          value={formData.apiKey}
                          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="Enter your API key"
                          className="input w-full"
                        />
                      </div>

                      {selectedProvider === 'livekit' && (
                        <>
                          <div>
                            <label className="label">LiveKit URL</label>
                            <input
                              type="text"
                              value={formData.config.url || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                config: { ...formData.config, url: e.target.value }
                              })}
                              placeholder="wss://your-app.livekit.cloud"
                              className="input w-full"
                            />
                          </div>
                          <div>
                            <label className="label">API Secret</label>
                            <input
                              type="password"
                              value={formData.config.secret || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                config: { ...formData.config, secret: e.target.value }
                              })}
                              placeholder="Your LiveKit API secret"
                              className="input w-full"
                            />
                          </div>
                        </>
                      )}

                      {selectedProvider === 'elevenlabs' && (
                        <div>
                          <label className="label">Agent ID (Optional)</label>
                          <input
                            type="text"
                            value={formData.config.agentId || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              config: { ...formData.config, agentId: e.target.value }
                            })}
                            placeholder="Your ElevenLabs agent ID"
                            className="input w-full"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProvider}
                    className="btn btn-primary"
                    disabled={!selectedProvider || !formData.apiKey || saving}
                  >
                    {saving ? 'Adding...' : 'Add Provider'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
