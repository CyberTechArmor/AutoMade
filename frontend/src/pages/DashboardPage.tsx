import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">AutoMade</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.displayName || user?.email}</span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome Card */}
          <div className="card md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome, {user?.displayName}!
            </h2>
            <p className="text-gray-600 mt-2">
              This is your dashboard. You're successfully logged in.
            </p>
          </div>

          {/* Security Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Security</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {user?.mfaEnabled
                ? 'Two-factor authentication is enabled on your account.'
                : 'Enhance your security by enabling two-factor authentication.'}
            </p>
            <Link
              to="/settings/security"
              className="btn btn-primary inline-block"
            >
              {user?.mfaEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </Link>
          </div>

          {/* Account Info Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Account</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Role:</span> {user?.role}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">2FA:</span>{' '}
                {user?.mfaEnabled ? (
                  <span className="text-green-600">Enabled</span>
                ) : (
                  <span className="text-yellow-600">Disabled</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <Link
                to="/settings/security"
                className="block text-blue-600 hover:text-blue-700"
              >
                Security Settings
              </Link>
              <Link
                to="/settings/password"
                className="block text-blue-600 hover:text-blue-700"
              >
                Change Password
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
