import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';
import type { Session, SessionTranscript, SessionState } from '../types';

const STATE_COLORS: Record<SessionState, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [transcripts, setTranscripts] = useState<SessionTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadSession();
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const [sessionData, transcriptsData] = await Promise.all([
        api.getSession(id!),
        api.getSessionTranscripts(id!),
      ]);
      setSession(sessionData);
      setTranscripts(transcriptsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      const updated = await api.startSession(id!);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this session?')) return;
    try {
      const updated = await api.endSession(id!);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const content = message.trim();
    setMessage('');
    setSending(true);

    try {
      const response = await api.sendSessionMessage(id!, content);
      // Add both user message and AI response to transcripts
      setTranscripts((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          sessionId: id!,
          speakerId: 'user',
          speakerType: 'human',
          speakerName: 'You',
          content,
          timestampMs: Date.now(),
          flagged: false,
          createdAt: new Date().toISOString(),
        },
        response.transcript,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessage(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const output = await api.summarizeSession(id!);
      setSession((prev) => prev ? { ...prev, output } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

  if (error || !session) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Session not found'}</p>
          <Link to="/sessions" className="btn btn-primary">
            Back to Sessions
          </Link>
        </div>
      </Layout>
    );
  }

  const isActive = session.state === 'in_progress';
  const canStart = session.state === 'scheduled' || session.state === 'pending';
  const isCompleted = session.state === 'completed';

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/sessions" className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{session.title}</h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATE_COLORS[session.state] || 'bg-gray-100 text-gray-800'}`}>
                  {(session.state || 'unknown').replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-500 capitalize">{session.type} session</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canStart && (
              <button onClick={handleStartSession} className="btn btn-primary">
                Start Session
              </button>
            )}
            {isActive && (
              <button onClick={handleEndSession} className="btn btn-danger">
                End Session
              </button>
            )}
            {isCompleted && !session.output?.summary && (
              <button onClick={handleSummarize} className="btn btn-secondary" disabled={summarizing}>
                {summarizing ? 'Generating...' : 'Generate Summary'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Main Content - Chat/Transcripts */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="card flex-1 flex flex-col p-0 min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcripts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {isActive
                      ? 'Start the conversation by sending a message below.'
                      : canStart
                      ? 'Start the session to begin the conversation.'
                      : 'No transcript available.'}
                  </div>
                ) : (
                  transcripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className={`flex gap-3 ${transcript.speakerType === 'llm' ? '' : 'flex-row-reverse'}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          transcript.speakerType === 'llm'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        {transcript.speakerType === 'llm' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className={`max-w-[70%] ${transcript.speakerType === 'llm' ? '' : 'text-right'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {transcript.speakerName || (transcript.speakerType === 'llm' ? 'AI Assistant' : 'User')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(transcript.timestampMs)}
                          </span>
                          {transcript.flagged && (
                            <span className="text-xs text-red-500">Flagged</span>
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            transcript.speakerType === 'llm'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{transcript.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {isActive && (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="input flex-1"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || sending}
                      className="btn btn-primary"
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-4 flex-shrink-0 overflow-y-auto">
            {/* Session Info */}
            <div className="card">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Session Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="capitalize">{session.type}</span>
                </div>
                {session.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span>{formatDuration(session.duration)}</span>
                  </div>
                )}
                {session.scheduledAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Scheduled</span>
                    <span>{new Date(session.scheduledAt).toLocaleString()}</span>
                  </div>
                )}
                {session.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Started</span>
                    <span>{new Date(session.startedAt).toLocaleString()}</span>
                  </div>
                )}
                {session.endedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ended</span>
                    <span>{new Date(session.endedAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Facilitation</span>
                  <span>{session.isAutonomous ? 'AI' : 'Manual'}</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            {session.output && (
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Session Summary</h2>
                {session.output.summary && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">{session.output.summary}</p>
                  </div>
                )}
                {session.output.keyInsights && session.output.keyInsights.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Key Insights</h3>
                    <ul className="space-y-1">
                      {session.output.keyInsights.map((insight, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {session.output.actionItems && session.output.actionItems.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Action Items</h3>
                    <ul className="space-y-1">
                      {session.output.actionItems.map((item, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <input type="checkbox" className="mt-1 rounded border-gray-300" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {session.output.nextSteps && session.output.nextSteps.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 mb-2">Next Steps</h3>
                    <ul className="space-y-1">
                      {session.output.nextSteps.map((step, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 mt-1">→</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Recording */}
            {session.recordingUrl && (
              <div className="card">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Recording</h2>
                <a
                  href={session.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary w-full text-center"
                >
                  View Recording
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
