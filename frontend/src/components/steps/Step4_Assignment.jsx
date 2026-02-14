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
  const [filter, setFilter] = useState('all'); // all, high, medium, low
  const [sortBy, setSortBy] = useState('epic'); // epic, points, developer, confidence
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedScore, setExpandedScore] = useState(null);

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
    const headers = ['Epic ID', 'Epic Title', 'Epic Type', 'Story Points', 'Stories', 'Developer', 'Expertise', 'Experience', 'Score', 'Confidence'];
    const rows = filteredAndSortedAssignments.map(a => [
      a.epic.epic_id,
      `"${a.epic.epic_title}"`,
      a.epic.classification?.primary || 'N/A',
      a.epic.totalStoryPoints,
      a.epic.userStoriesCount,
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
    a.download = `epic-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      totalEpics: assignments.length,
      totalDevelopers: developers.length,
      totalStoryPoints: assignments.reduce((sum, a) => sum + a.epic.totalStoryPoints, 0),
      workloadDistribution,
      assignments: filteredAndSortedAssignments.map(a => ({
        epic: {
          id: a.epic.epic_id,
          title: a.epic.epic_title,
          type: a.epic.classification?.primary,
          storyPoints: a.epic.totalStoryPoints,
          storiesCount: a.epic.userStoriesCount
        },
        developer: {
          username: a.developer.username,
          expertise: a.developer.expertise,
          experienceLevel: a.developer.experienceLevel,
          score: a.score
        },
        confidence: a.confidence,
        alternatives: a.alternatives
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epic-assignments-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
    if (confidence === 'medium') return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300';
    if (confidence === 'manual') return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
    return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
  };

  const hasExpertiseMismatch = (assignment) => {
    const epicType = assignment.epic.classification?.primary || '';
    const devExpertise = assignment.developer.expertise || '';
    return epicType && devExpertise && !epicType.includes(devExpertise) && !devExpertise.includes(epicType.split(' ')[0]);
  };

  // Filter and sort assignments
  const filteredAndSortedAssignments = assignments
    .filter(a => {
      // Filter by confidence
      if (filter !== 'all' && a.confidence !== filter) return false;
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          a.epic.epic_title.toLowerCase().includes(term) ||
          a.epic.epic_id.toLowerCase().includes(term) ||
          a.developer.username.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'points') return b.epic.totalStoryPoints - a.epic.totalStoryPoints;
      if (sortBy === 'developer') return a.developer.username.localeCompare(b.developer.username);
      if (sortBy === 'confidence') {
        const order = { high: 3, medium: 2, low: 1, manual: 0 };
        return (order[b.confidence] || 0) - (order[a.confidence] || 0);
      }
      return 0; // default epic order
    });

  // Calculate statistics
  const stats = {
    totalPoints: assignments.reduce((sum, a) => sum + a.epic.totalStoryPoints, 0),
    avgPoints: assignments.length > 0 ? Math.round(assignments.reduce((sum, a) => sum + a.epic.totalStoryPoints, 0) / assignments.length) : 0,
    highConfidence: assignments.filter(a => a.confidence === 'high').length,
    mediumConfidence: assignments.filter(a => a.confidence === 'medium').length,
    lowConfidence: assignments.filter(a => a.confidence === 'low').length,
    mismatches: assignments.filter(hasExpertiseMismatch).length
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
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Epics</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{assignments.length}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">Developers</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{developers.length}</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Points</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalPoints}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">High Conf.</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.highConfidence}</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">Med Conf.</div>
                <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.mediumConfidence}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">Low Conf.</div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.lowConfidence}</div>
              </div>
            </div>

            {/* Warnings */}
            {stats.mismatches > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 dark:text-orange-400 text-xl">⚠️</span>
                  <div>
                    <div className="font-medium text-orange-900 dark:text-orange-200">
                      {stats.mismatches} expertise mismatch{stats.mismatches > 1 ? 'es' : ''} detected
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Some epics are assigned to developers with different expertise areas. Consider reviewing these assignments.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Search epics or developers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Confidence</option>
                <option value="high">High Only</option>
                <option value="medium">Medium Only</option>
                <option value="low">Low Only</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="epic">Sort by Epic</option>
                <option value="points">Sort by Points</option>
                <option value="developer">Sort by Developer</option>
                <option value="confidence">Sort by Confidence</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white
                           rounded-lg transition-colors text-sm"
                  title="Export to CSV"
                >
                  📥 CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white
                           rounded-lg transition-colors text-sm"
                  title="Export to JSON"
                >
                  📄 JSON
                </button>
                <button
                  onClick={handleAutoAssign}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                           rounded-lg transition-colors text-sm"
                  title="Recalculate assignments"
                >
                  🔄 Re-assign
                </button>
              </div>
            </div>

            {/* Results count */}
            {searchTerm && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredAndSortedAssignments.length} of {assignments.length} assignments
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workload Distribution */}
      {assignments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Workload Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(workloadDistribution).map(([username, points]) => {
              const maxPoints = Math.max(...Object.values(workloadDistribution));
              const percentage = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
              const dev = developers.find(d => d.username === username);

              return (
                <div key={username} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-48">
                    {dev && (
                      <img
                        src={dev.avatar}
                        alt={username}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {username}
                    </div>
                  </div>
                  <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end px-3 transition-all duration-300"
                      style={{
                        width: `${Math.max(percentage, 15)}%` // Minimum 15% width for visibility
                      }}
                    >
                      <span className="text-white text-sm font-bold">{points} pts</span>
                    </div>
                    {percentage < 15 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 text-sm font-bold">
                        {points} pts
                      </span>
                    )}
                  </div>
                  <div className="w-16 text-right text-sm text-gray-600 dark:text-gray-400">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Balance indicator */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Workload Balance</div>
            <div className="flex items-center gap-2">
              {(() => {
                const values = Object.values(workloadDistribution);
                const max = Math.max(...values);
                const min = Math.min(...values);
                const diff = max > 0 ? ((max - min) / max) * 100 : 0;
                const isBalanced = diff < 30;

                return (
                  <>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isBalanced
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {isBalanced ? '✓ Well Balanced' : '⚠ Unbalanced'}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {diff.toFixed(0)}% difference between max and min
                    </span>
                  </>
                );
              })()}
            </div>
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
            {filteredAndSortedAssignments.map((assignment, index) => {
              const mismatch = hasExpertiseMismatch(assignment);

              return (
                <div
                  key={assignment.epic.epic_id}
                  className={`border rounded-lg p-4 ${
                    mismatch
                      ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xl">{
                          assignment.epic.classification?.primary === 'Mobile Development' ? '📱' :
                          assignment.epic.classification?.primary === 'Frontend Development' ? '🌐' :
                          assignment.epic.classification?.primary === 'Backend Development' ? '⚙️' :
                          assignment.epic.classification?.primary === 'DevOps/Infrastructure' ? '🚀' :
                          assignment.epic.classification?.primary === 'Data Science/ML' ? '📊' :
                          assignment.epic.classification?.primary === 'Database/SQL' ? '💾' : '💻'
                        }</span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900
                                       text-blue-700 dark:text-blue-300 rounded">
                          {assignment.epic.epic_id}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getConfidenceColor(assignment.confidence)}`}>
                          {assignment.confidence} confidence
                        </span>
                        {mismatch && (
                          <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900
                                         text-orange-700 dark:text-orange-300 rounded">
                            ⚠️ Expertise Mismatch
                          </span>
                        )}
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
                    <button
                      onClick={() => setExpandedScore(expandedScore === assignment.epic.epic_id ? null : assignment.epic.epic_id)}
                      className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500
                               text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      {expandedScore === assignment.epic.epic_id ? 'Hide Details' : 'Score Details'}
                    </button>
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

                  {/* Score breakdown */}
                  {expandedScore === assignment.epic.epic_id && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Assignment Score Breakdown</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Expertise Match:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{Math.round(assignment.score * 0.5)} / 50 pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Experience Level:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{Math.round(assignment.score * 0.3)} / 30 pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Workload Balance:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{Math.round(assignment.score * 0.2)} / 20 pts</span>
                        </div>
                        <div className="pt-2 border-t border-gray-300 dark:border-gray-600 flex justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">Total Score:</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{assignment.score} / 100</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {assignment.alternatives && assignment.alternatives.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Alternative developers:</div>
                      <div className="flex flex-wrap gap-2">
                        {assignment.alternatives.map((alt, i) => (
                          <button
                            key={i}
                            onClick={() => handleReassign(assignment.epic.epic_id, alt.username)}
                            className="text-xs px-3 py-1.5 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600
                                     border border-gray-300 dark:border-gray-600 rounded transition-colors"
                          >
                            {alt.username} ({alt.expertise}, score: {alt.score})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredAndSortedAssignments.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No assignments match your filters
            </div>
          )}
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
