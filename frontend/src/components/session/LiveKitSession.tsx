import { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useParticipants,
} from '@livekit/components-react';
import { api } from '../../services/api';

interface Props {
  sessionId: string;
  onLeave?: () => void;
}

export default function LiveKitSession({ sessionId, onLeave }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    joinSession();
  }, [sessionId]);

  const joinSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, ensure the room exists
      await api.createSessionRoom(sessionId);

      // Then get a token to join
      const response = await api.getSessionToken(sessionId, {
        canPublish: true,
        canSubscribe: true,
      });

      setToken(response.token);
      // The server URL should come from environment or API
      setServerUrl(import.meta.env.VITE_LIVEKIT_URL || 'wss://localhost:7880');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnected = useCallback(() => {
    onLeave?.();
  }, [onLeave]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white">Joining session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button onClick={joinSession} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
        <div className="text-white">Unable to connect to session</div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnected}
        audio={true}
        video={true}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

// Participant list component
function ParticipantList() {
  const participants = useParticipants();

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-3">Participants ({participants.length})</h3>
      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.identity}
            className="flex items-center gap-2 text-gray-300"
          >
            <div className={`w-2 h-2 rounded-full ${participant.isSpeaking ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span>{participant.name || participant.identity}</span>
            {participant.isSpeaking && (
              <span className="text-xs text-green-400">speaking</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Audio-only session variant
export function AudioSession({ sessionId }: { sessionId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    joinSession();
  }, [sessionId]);

  const joinSession = async () => {
    try {
      setLoading(true);
      await api.createSessionRoom(sessionId);
      const response = await api.getSessionToken(sessionId, {
        canPublish: true,
        canSubscribe: true,
      });
      setToken(response.token);
      setServerUrl(import.meta.env.VITE_LIVEKIT_URL || 'wss://localhost:7880');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
        <div className="text-red-600">{error || 'Unable to connect'}</div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      data-lk-theme="default"
    >
      <div className="bg-gray-100 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Voice Session</h3>
          <ParticipantList />
        </div>
        <ControlBar variation="minimal" />
        <RoomAudioRenderer />
      </div>
    </LiveKitRoom>
  );
}
