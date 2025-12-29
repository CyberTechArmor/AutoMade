import { useState, type FormEvent, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MfaVerifyPage() {
  const navigate = useNavigate();
  const { mfaPending, verifyMfa, verifyBackupCode, cancelMfa } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  // Redirect if no MFA pending
  if (!mfaPending) {
    navigate('/login');
    return null;
  }

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
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
    } else {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (useBackupCode) {
        await verifyBackupCode(backupCode);
      } else {
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
          setError('Please enter a 6-digit code');
          setIsLoading(false);
          return;
        }
        await verifyMfa(fullCode);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    cancelMfa();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Two-Factor Authentication
          </h1>
          <p className="text-gray-600 mt-2">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the code from your authenticator app'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {useBackupCode ? (
            <div>
              <label htmlFor="backupCode" className="label">
                Backup Code
              </label>
              <input
                id="backupCode"
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                className="input text-center text-lg tracking-widest"
                placeholder="XXXX-XXXX"
                maxLength={9}
                required
              />
            </div>
          ) : (
            <div>
              <label className="label text-center block">
                Verification Code
              </label>
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
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-700 text-sm w-full"
          >
            {useBackupCode
              ? 'Use authenticator app instead'
              : 'Use a backup code'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-sm w-full"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    </div>
  );
}
