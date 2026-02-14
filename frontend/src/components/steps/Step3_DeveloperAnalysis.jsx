import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const COLORS = ['#10b981', '#ef4444']; // On-time, Late
const FILE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#6b7280',
  '#14b8a6',
  '#a855f7',
];

export default function Step3_DeveloperAnalysis() {
  const {
    developers,
    setDevelopers,
    nextStep,
    previousStep
  } = useWorkflow();

  const [devInputs, setDevInputs] = useState([
    { username: '', owner: '', repo: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDev, setExpandedDev] = useState(null);

  const addDeveloperInput = () => {
    setDevInputs([...devInputs, { username: '', owner: '', repo: '' }]);
  };

  const removeDeveloperInput = (index) => {
    setDevInputs(devInputs.filter((_, i) => i !== index));
  };

  const updateDeveloperInput = (index, field, value) => {
    const updated = [...devInputs];
    updated[index][field] = value;
    setDevInputs(updated);
  };

  const handleAnalyze = async () => {
    const validInputs = devInputs.filter(d => d.username.trim());

    if (validInputs.length === 0) {
      setError('Please enter at least one GitHub username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developers: validInputs })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze developers');
      }

      setDevelopers(data.developers);
      if (data.developers.length === 0) {
        setError('No developers could be analyzed. Check usernames and try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (developers.length === 0) {
      alert('Please analyze at least one developer before proceeding');
      return;
    }
    nextStep();
  };

  const toggleExpand = (index) => {
    setExpandedDev(expandedDev === index ? null : index);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Analyze Developers
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Enter GitHub usernames to analyze developer expertise from commit history
        </p>

        <div className="space-y-4 mb-6">
          {devInputs.map((dev, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="GitHub Username (required)"
                  value={dev.username}
                  onChange={(e) => updateDeveloperInput(index, 'username', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Owner (optional)"
                  value={dev.owner}
                  onChange={(e) => updateDeveloperInput(index, 'owner', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Repository (optional)"
                  value={dev.repo}
                  onChange={(e) => updateDeveloperInput(index, 'repo', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              {devInputs.length > 1 && (
                <button
                  onClick={() => removeDeveloperInput(index)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={addDeveloperInput}
            disabled={loading || devInputs.length >= 10}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700
                     dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                     disabled:opacity-50 transition-colors"
          >
            + Add Developer
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                     text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Analyzing...
              </>
            ) : (
              <>
                <span>🔍</span>
                Analyze Developers
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {developers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Analysis Results ({developers.length} developers)
          </h3>

          <div className="space-y-4">
            {developers.map((dev, index) => (
              <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                {/* Summary Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-start gap-4">
                    <img
                      src={dev.avatar}
                      alt={dev.username}
                      className="w-16 h-16 rounded-full"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                        {dev.username}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium
                          ${dev.analysis.experienceLevel.tone === 'purple' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' : ''}
                          ${dev.analysis.experienceLevel.tone === 'blue' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : ''}
                          ${dev.analysis.experienceLevel.tone === 'green' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : ''}
                          ${dev.analysis.experienceLevel.tone === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' : ''}
                        `}>
                          {dev.analysis.experienceLevel.level}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                          {dev.analysis.expertise.primaryIcon} {dev.analysis.expertise.primary}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">Commits</div>
                          <div className="font-bold text-gray-900 dark:text-white">{dev.analysis.totalCommits}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">On-Time %</div>
                          <div className="font-bold text-gray-900 dark:text-white">{dev.analysis.onTimePercentage}%</div>
                        </div>
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">Consistency</div>
                          <div className="font-bold text-gray-900 dark:text-white">{dev.analysis.consistencyScore}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">Avg Size</div>
                          <div className="font-bold text-gray-900 dark:text-white">{dev.analysis.avgCommitSize} lines</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top Skills:</div>
                        <div className="flex flex-wrap gap-1">
                          {dev.analysis.expertise.all.slice(0, 4).map((exp, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                              {exp.icon} {exp.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExpand(index)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      {expandedDev === index ? 'Hide Details ▲' : 'Show Details ▼'}
                    </button>
                  </div>
                </div>

                {/* Detailed Charts - Expanded */}
                {expandedDev === index && (
                  <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600">
                    {/* Experience Badge */}
                    <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl p-6 text-white mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">
                            Experience: {dev.analysis.experienceLevel.level}
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-white/80">Total Lines Changed</p>
                              <p className="text-xl font-semibold">
                                +{dev.analysis.totalLinesAdded.toLocaleString()} / -{dev.analysis.totalLinesDeleted.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-white/80">Avg Commit Size</p>
                              <p className="text-xl font-semibold">{dev.analysis.avgCommitSize} lines</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* First Row Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* File Type Diversity */}
                      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          📁 File Type Diversity
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={dev.analysis.fileTypes}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={70}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {dev.analysis.fileTypes.map((_, i) => (
                                <Cell key={`cell-${i}`} fill={FILE_COLORS[i % FILE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Commit Sizes */}
                      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          📊 Commit Sizes
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={dev.analysis.commitSizeDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Commit Frequency */}
                      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          📈 Commit Frequency
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={dev.analysis.consistencyTimeline}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="commit" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="days" stroke="#8b5cf6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Second Row Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* On-Time vs Late */}
                      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          ⏰ On-Time vs Late
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'On-Time', value: dev.analysis.onTimeCount },
                                { name: 'Late', value: dev.analysis.lateCount },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {COLORS.map((color, i) => (
                                <Cell key={`cell-${i}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Weekday Activity */}
                      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          📅 Weekday Activity
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={dev.analysis.weekdayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="commits" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Hourly Activity - Full Width */}
                    <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        🕐 Hourly Activity
                      </h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dev.analysis.hourlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="hour" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="commits" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={previousStep}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50
                       dark:hover:bg-gray-700 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleProceed}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white
                       font-medium rounded-lg transition-colors"
            >
              Proceed to Assignment →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
