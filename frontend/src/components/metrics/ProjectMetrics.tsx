import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ProjectMetrics as ProjectMetricsType, TimeEntry, CreateTimeEntryInput } from '../../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface Props {
  projectId: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function ProjectMetricsComponent({ projectId }: Props) {
  const [metrics, setMetrics] = useState<ProjectMetricsType | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState<CreateTimeEntryInput>({
    entryDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
    hours: '',
    description: '',
    billable: true,
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, entriesData] = await Promise.all([
        api.getProjectMetrics(projectId),
        api.listTimeEntries(projectId),
      ]);
      setMetrics(metricsData);
      setTimeEntries(entriesData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async () => {
    try {
      setAdding(true);
      await api.createTimeEntry(projectId, newEntry);
      setShowAddEntry(false);
      setNewEntry({
        entryDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
        hours: '',
        description: '',
        billable: true,
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add time entry');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {error}
      </div>
    );
  }

  if (!metrics) {
    return <div className="text-gray-500">No metrics data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalHours.toFixed(1)}h</div>
          {metrics.estimatedVsActual.estimatedHours && (
            <div className="text-xs text-gray-400">
              of {metrics.estimatedVsActual.estimatedHours}h estimated
            </div>
          )}
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Billable Hours</div>
          <div className="text-2xl font-bold text-green-600">{metrics.billableHours.toFixed(1)}h</div>
          <div className="text-xs text-gray-400">
            {metrics.totalHours > 0 ? ((metrics.billableHours / metrics.totalHours) * 100).toFixed(0) : 0}% of total
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Total Cost</div>
          <div className="text-2xl font-bold text-gray-900">${(metrics.totalCost / 100).toFixed(2)}</div>
          {metrics.estimatedVsActual.estimatedCost && (
            <div className="text-xs text-gray-400">
              of ${(metrics.estimatedVsActual.estimatedCost / 100).toFixed(2)} estimated
            </div>
          )}
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Milestones</div>
          <div className="text-2xl font-bold text-blue-600">
            {metrics.milestoneProgress.completed}/{metrics.milestoneProgress.total}
          </div>
          <div className="text-xs text-gray-400">
            {metrics.milestoneProgress.progress}% complete
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hours Over Time */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours Over Time</h3>
          {metrics.hoursOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={metrics.hoursOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis />
                <Tooltip
                  labelFormatter={(d) => new Date(d as string).toLocaleDateString()}
                  formatter={(value) => [`${(value as number).toFixed(1)}h`, 'Hours']}
                />
                <Area type="monotone" dataKey="hours" stroke="#3B82F6" fill="#93C5FD" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              No time entries yet
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          {metrics.costBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics.costBreakdown}
                  dataKey="amount"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {metrics.costBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${((value as number) / 100).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              No cost entries yet
            </div>
          )}
        </div>
      </div>

      {/* Time Entries List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Time Entries</h3>
          <button onClick={() => setShowAddEntry(true)} className="btn btn-primary">
            Log Time
          </button>
        </div>
        {timeEntries.length === 0 ? (
          <p className="text-gray-500">No time entries yet.</p>
        ) : (
          <div className="space-y-2">
            {timeEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="font-medium text-gray-900">{entry.hours}h</div>
                  <div className="text-sm text-gray-500">
                    {entry.description || 'No description'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {new Date(entry.entryDate).toLocaleDateString()}
                  </div>
                  <div className={`text-xs ${entry.billable ? 'text-green-600' : 'text-gray-400'}`}>
                    {entry.billable ? 'Billable' : 'Non-billable'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Time Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Log Time</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={newEntry.entryDate.split('T')[0]}
                  onChange={(e) => setNewEntry({ ...newEntry, entryDate: e.target.value + 'T00:00:00.000Z' })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Hours</label>
                <input
                  type="text"
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                  className="input"
                  placeholder="e.g., 1.5"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={newEntry.description || ''}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="What did you work on?"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="billable"
                  checked={newEntry.billable}
                  onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="billable" className="text-sm text-gray-700">
                  Billable time
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddEntry(false)}
                className="btn btn-secondary"
                disabled={adding}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                className="btn btn-primary"
                disabled={adding || !newEntry.hours}
              >
                {adding ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
