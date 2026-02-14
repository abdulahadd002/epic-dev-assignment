import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';

export default function Step4_Assignment() {
  const {
    approvedEpics,
    developers,
    assignments,
    workloadDistribution,
    setAssignments,
    reassignEpic,
    previousStep
  } = useWorkflow();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAutoAssign = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epics: approvedEpics,
          developers
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to auto-assign epics');
      }

      setAssignments(data.assignments, data.workloadDistribution);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = (epicId, newDeveloperUsername) => {
    reassignEpic(epicId, newDeveloperUsername);
  };

  const exportToCSV = () => {
    const headers = ['Epic ID', 'Epic Title', 'Story Points', 'Developer', 'Expertise', 'Experience', 'Score', 'Confidence'];
    const rows = assignments.map(a => [
      a.epic.epic_id,
      a.epic.epic_title,
      a.epic.totalStoryPoints,
      a.developer.username,
      a.developer.expertise,
      a.developer.experienceLevel,
      a.score,
      a.confidence
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'epic-assignments.csv';
    a.click();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
    if (confidence === 'medium') return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300';
    if (confidence === 'manual') return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
    return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Epic Assignment Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Auto-assign epics to developers based on expertise matching and workload balancing
        </p>

        {assignments.length === 0 ? (
          <div>
            <button
              onClick={handleAutoAssign}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                       text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Calculating assignments...
                </>
              ) : (
                <>
                  <span>🎯</span>
                  Auto-Assign Epics
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {assignments.length} epics assigned to {developers.length} developers
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white
                           rounded-lg transition-colors text-sm"
                >
                  📥 Export CSV
                </button>
                <button
                  onClick={handleAutoAssign}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                           rounded-lg transition-colors text-sm"
                >
                  🔄 Re-assign
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Workload Distribution */}
      {assignments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Workload Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(workloadDistribution).map(([username, points]) => (
              <div key={username} className="flex items-center gap-3">
                <div className="w-32 text-sm text-gray-700 dark:text-gray-300">{username}</div>
                <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-blue-500 flex items-center justify-end px-2"
                    style={{
                      width: `${(points / Math.max(...Object.values(workloadDistribution))) * 100}%`
                    }}
                  >
                    <span className="text-white text-sm font-medium">{points} pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments Grid */}
      {assignments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Epic Assignments
          </h3>
          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <div key={assignment.epic.epic_id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{assignment.epic.classification?.primary === 'Mobile Development' ? '📱' :
                        assignment.epic.classification?.primary === 'Frontend Development' ? '🌐' :
                        assignment.epic.classification?.primary === 'Backend Development' ? '⚙️' :
                        assignment.epic.classification?.primary === 'DevOps/Infrastructure' ? '🚀' : '💻'}</span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900
                                     text-blue-700 dark:text-blue-300 rounded">
                        {assignment.epic.epic_id}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getConfidenceColor(assignment.confidence)}`}>
                        {assignment.confidence} confidence
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{assignment.epic.epic_title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {assignment.epic.classification?.primary} • {assignment.epic.totalStoryPoints} story points • {assignment.epic.userStoriesCount} stories
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <img
                    src={assignment.developer.avatar}
                    alt={assignment.developer.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {assignment.developer.username}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {assignment.developer.expertise} • {assignment.developer.experienceLevel} • Score: {assignment.score}
                    </div>
                  </div>
                  <select
                    value={assignment.developer.username}
                    onChange={(e) => handleReassign(assignment.epic.epic_id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value={assignment.developer.username}>Current: {assignment.developer.username}</option>
                    {developers
                      .filter(d => d.username !== assignment.developer.username)
                      .map(dev => (
                        <option key={dev.username} value={dev.username}>
                          Reassign to: {dev.username} ({dev.analysis.expertise.primary})
                        </option>
                      ))}
                  </select>
                </div>

                {assignment.alternatives && assignment.alternatives.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Alternative developers:</div>
                    <div className="flex flex-wrap gap-2">
                      {assignment.alternatives.map((alt, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white dark:bg-gray-700 rounded">
                          {alt.username} ({alt.expertise}, score: {alt.score})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          onClick={previousStep}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600
                   text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50
                   dark:hover:bg-gray-700 transition-colors"
        >
          ← Back
        </button>
        {assignments.length > 0 && (
          <div className="flex-1 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
            ✅ Assignment complete! Export or modify assignments as needed.
          </div>
        )}
      </div>
    </div>
  );
}
