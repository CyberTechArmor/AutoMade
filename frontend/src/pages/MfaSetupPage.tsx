import { useState, useEffect, type FormEvent, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { MfaSetupResponse } from '../types';

export default function MfaSetupPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Start MFA setup on mount
    const initSetup = async () => {
      try {
        const data = await api.beginMfaSetup();
        setSetupData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start MFA setup');
      }
    };
    initSetup();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    if (pastedData.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter a 6-digit code');
      setIsLoading(false);
      return;
    }

    try {
      const result = await api.completeMfaSetup(fullCode);
      setBackupCodes(result.backupCodes);
      setStep('backup');
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
  };

  if (error && !setupData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link to="/settings/security" className="btn btn-primary">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/settings/security"
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Set Up Two-Factor Authentication
            </h1>
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center gap-4">
          <div
            className={`flex items-center gap-2 ${
              step === 'setup' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'setup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-green-500 text-white'
              }`}
            >
              {step === 'setup' ? '1' : '✓'}
            </span>
            <span className="hidden sm:inline">Scan QR Code</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200" />
          <div
            className={`flex items-center gap-2 ${
              step === 'verify' ? 'text-blue-600' : step === 'backup' ? 'text-gray-400' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'verify'
                  ? 'bg-blue-600 text-white'
                  : step === 'backup'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {step === 'backup' ? '✓' : '2'}
            </span>
            <span className="hidden sm:inline">Verify Code</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200" />
          <div
            className={`flex items-center gap-2 ${
              step === 'backup' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'backup' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              3
            </span>
            <span className="hidden sm:inline">Backup Codes</span>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {step === 'setup' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Scan QR Code
            </h2>
            <p className="text-gray-600 mb-6">
              Scan this QR code with your authenticator app (like Google
              Authenticator, Authy, or 1Password).
            </p>

            {setupData ? (
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border mb-6">
                  <img
                    src={setupData.qrCode}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>

                <p className="text-sm text-gray-500 mb-2">
                  Can't scan? Enter this code manually:
                </p>
                <code className="bg-gray-100 px-4 py-2 rounded text-sm font-mono break-all">
                  {setupData.secret}
                </code>

                <button
                  onClick={() => {
                    setStep('verify');
                    setTimeout(() => inputRefs.current[0]?.focus(), 100);
                  }}
                  className="btn btn-primary mt-6"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            )}
          </div>
        )}

        {step === 'verify' && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Verify Code
            </h2>
            <p className="text-gray-600 mb-6">
              Enter the 6-digit code from your authenticator app to verify the
              setup.
            </p>

            <form onSubmit={handleVerify} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setStep('setup')}
                  className="btn btn-secondary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'backup' && (
          <div className="card">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Two-Factor Authentication Enabled!
              </h2>
              <p className="text-gray-600 mt-2">
                Save these backup codes in a secure place. You can use them to
                access your account if you lose your phone.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="bg-white px-3 py-2 rounded border text-center font-mono text-sm"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCopyBackupCodes}
                className="btn btn-secondary"
              >
                Copy Codes
              </button>
              <button
                onClick={() => navigate('/settings/security')}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              Each backup code can only be used once. Keep them safe!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
