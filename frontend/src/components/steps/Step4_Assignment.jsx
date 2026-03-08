import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, Search, ChevronDown, AlertTriangle, Loader2, FileJson, FileSpreadsheet } from 'lucide-react';
import SpotlightCard from '../shared/SpotlightCard';

const EPIC_ICONS = {
  'Mobile Development': '📱', 'Frontend Development': '🌐', 'Backend Development': '⚙️',
  'DevOps/Infrastructure': '🚀', 'Data Science/ML': '📊', 'Database/SQL': '💾'
};

const confidenceStyle = {
  high: 'bg-success/15 text-success',
  medium: 'bg-warning/15 text-warning',
  'manual-verified': 'bg-info/15 text-accent-cyan',
  manual: 'bg-warning/15 text-warning',
  low: 'bg-danger/15 text-danger',
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  })
};

export default function Step4_Assignment() {
  const {
    approvedEpics, developers, assignments, workloadDistribution,
    setAssignments, reassignEpic, previousStep
  } = useWorkflow();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('epic');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedScore, setExpandedScore] = useState(null);
  const [expandedStories, setExpandedStories] = useState(null);

  const handleAutoAssign = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epics: approvedEpics, developers })
      });
      const text = await response.text();
      if (!text) throw new Error('Empty response from server. Please try again.');
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Invalid response from server. Please try again.'); }
      if (!data.success) throw new Error(data.error || 'Failed to auto-assign epics');
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
      a.epic.epic_id, `"${a.epic.epic_title}"`, a.epic.classification?.primary || 'N/A',
      a.epic.totalStoryPoints, a.epic.userStoriesCount, a.developer.username,
      a.developer.expertise, a.developer.experienceLevel, a.score, a.confidence
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epic-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      totalEpics: assignments.length,
      totalDevelopers: developers.length,
      totalStoryPoints: assignments.reduce((sum, a) => sum + a.epic.totalStoryPoints, 0),
      workloadDistribution,
      assignments: filteredAndSortedAssignments.map(a => ({
        epic: { id: a.epic.epic_id, title: a.epic.epic_title, type: a.epic.classification?.primary, storyPoints: a.epic.totalStoryPoints, storiesCount: a.epic.userStoriesCount },
        developer: { username: a.developer.username, expertise: a.developer.expertise, experienceLevel: a.developer.experienceLevel, score: a.score },
        confidence: a.confidence, alternatives: a.alternatives
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epic-assignments-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const hasExpertiseMismatch = (assignment) => {
    const epicType = assignment.epic.classification?.primary || '';
    const devExpertise = assignment.developer.expertise || '';
    return epicType && devExpertise && !epicType.includes(devExpertise) && !devExpertise.includes(epicType.split(' ')[0]);
  };

  const filteredAndSortedAssignments = assignments
    .filter(a => {
      if (filter !== 'all' && a.confidence !== filter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return a.epic.epic_title.toLowerCase().includes(term) || a.epic.epic_id.toLowerCase().includes(term) || a.developer.username.toLowerCase().includes(term);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'points') return b.epic.totalStoryPoints - a.epic.totalStoryPoints;
      if (sortBy === 'developer') return a.developer.username.localeCompare(b.developer.username);
      if (sortBy === 'confidence') {
        const order = { high: 3, 'manual-verified': 2.5, medium: 2, manual: 1.5, low: 1 };
        return (order[b.confidence] || 0) - (order[a.confidence] || 0);
      }
      return 0;
    });

  const stats = {
    totalPoints: assignments.reduce((sum, a) => sum + a.epic.totalStoryPoints, 0),
    highConfidence: assignments.filter(a => a.confidence === 'high').length,
    mediumConfidence: assignments.filter(a => a.confidence === 'medium').length,
    lowConfidence: assignments.filter(a => a.confidence === 'low').length,
    mismatches: assignments.filter(hasExpertiseMismatch).length
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <SpotlightCard className="p-6">
        <h2 className="text-white">Epic Assignment Dashboard</h2>
        <p className="text-white/40 text-sm mt-1 mb-6">
          Auto-assign epics to developers based on expertise matching and workload balancing
        </p>

        {assignments.length === 0 ? (
          <div>
            <motion.button
              onClick={handleAutoAssign}
              disabled={loading}
              className="btn-accent w-full text-sm"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Calculating assignments...
                </span>
              ) : 'Auto-Assign Epics'}
            </motion.button>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20"
              >
                <p className="text-danger text-sm">{error}</p>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { label: 'Epics', value: assignments.length, color: 'text-accent-cyan' },
                { label: 'Devs', value: developers.length, color: 'text-purple' },
                { label: 'Points', value: stats.totalPoints, color: 'text-indigo' },
                { label: 'High', value: stats.highConfidence, color: 'text-success' },
                { label: 'Medium', value: stats.mediumConfidence, color: 'text-warning' },
                { label: 'Low', value: stats.lowConfidence, color: 'text-danger' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  className="stat-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <div className="stat-label">{s.label}</div>
                  <div className={`stat-value text-lg ${s.color}`}>{s.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Mismatch warning */}
            {stats.mismatches > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm text-warning font-medium">
                    {stats.mismatches} expertise mismatch{stats.mismatches > 1 ? 'es' : ''} detected
                  </div>
                  <div className="text-xs text-white/35 mt-0.5">
                    Some epics are assigned to developers with different expertise areas.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type="text"
                  placeholder="Search epics or developers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-dark pl-9 text-sm"
                />
              </div>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-dark w-auto text-sm">
                <option value="all">All Confidence</option>
                <option value="high">High Only</option>
                <option value="medium">Medium Only</option>
                <option value="low">Low Only</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-dark w-auto text-sm">
                <option value="epic">Sort by Epic</option>
                <option value="points">Sort by Points</option>
                <option value="developer">Sort by Developer</option>
                <option value="confidence">Sort by Confidence</option>
              </select>
              <div className="flex gap-1.5">
                <button onClick={exportToCSV} className="btn-subtle text-xs flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" />CSV
                </button>
                <button onClick={exportToJSON} className="btn-subtle text-xs flex items-center gap-1">
                  <FileJson className="w-3 h-3" />JSON
                </button>
                <button onClick={handleAutoAssign} className="btn-subtle text-xs text-accent-cyan flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />Re-assign
                </button>
              </div>
            </div>

            {searchTerm && (
              <div className="text-xs text-white/30">
                Showing {filteredAndSortedAssignments.length} of {assignments.length} assignments
              </div>
            )}
          </div>
        )}
      </SpotlightCard>

      {/* Workload Distribution */}
      {assignments.length > 0 && (
        <SpotlightCard className="p-6">
          <h3 className="text-xs font-mono uppercase tracking-wider text-white/30 mb-4">Workload Distribution</h3>
          <div className="space-y-3">
            {Object.entries(workloadDistribution).map(([username, points], i) => {
              const maxPoints = Math.max(...Object.values(workloadDistribution));
              const percentage = maxPoints > 0 ? (points / maxPoints) * 100 : 0;
              const dev = developers.find(d => d.username === username);

              return (
                <motion.div
                  key={username}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                >
                  <div className="flex items-center gap-2 w-40">
                    {dev && <img src={dev.avatar} alt={username} className="w-7 h-7 rounded-lg ring-1 ring-white/10" />}
                    <span className="text-sm text-white/60 truncate">{username}</span>
                  </div>
                  <div className="flex-1 h-8 bg-white/[0.02] rounded-lg overflow-hidden relative border border-white/[0.04]">
                    <motion.div
                      className="h-full bg-gradient-to-r from-accent-cyan/30 to-accent-cyan/10 flex items-center justify-end px-3"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(percentage, 15)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className="text-xs font-mono text-white/70">{points} pts</span>
                    </motion.div>
                    {percentage < 15 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-white/50">{points} pts</span>
                    )}
                  </div>
                  <span className="w-12 text-right text-xs font-mono text-white/25">{percentage.toFixed(0)}%</span>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-2">
            {(() => {
              const values = Object.values(workloadDistribution);
              const max = Math.max(...values);
              const min = Math.min(...values);
              const diff = max > 0 ? ((max - min) / max) * 100 : 0;
              const isBalanced = diff < 30;

              return (
                <>
                  <span className={`badge ${isBalanced ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                    {isBalanced ? 'Balanced' : 'Unbalanced'}
                  </span>
                  <span className="text-xs text-white/30">{diff.toFixed(0)}% difference</span>
                </>
              );
            })()}
          </div>
        </SpotlightCard>
      )}

      {/* Assignments */}
      {assignments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-white/30">Epic Assignments</h3>

          {filteredAndSortedAssignments.map((assignment, i) => {
            const mismatch = hasExpertiseMismatch(assignment);
            const icon = EPIC_ICONS[assignment.epic.classification?.primary] || '💻';

            return (
              <motion.div
                key={assignment.epic.epic_id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="show"
              >
                <SpotlightCard className={`p-4 space-y-3 ${mismatch ? 'border-warning/20' : ''}`}>
                  {/* Epic info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-lg">{icon}</span>
                      <span className="badge bg-accent-cyan/15 text-accent-cyan">{assignment.epic.epic_id}</span>
                      <span className={`badge ${confidenceStyle[assignment.confidence] || confidenceStyle.low}`}>
                        {assignment.confidence}
                      </span>
                      {mismatch && (
                        <span className="badge bg-warning/15 text-warning flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />Mismatch
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-white">{assignment.epic.epic_title}</h4>
                    <p className="text-xs text-white/35 mt-1">
                      {assignment.epic.classification?.primary} · {assignment.epic.totalStoryPoints} pts · {assignment.epic.userStoriesCount} stories
                    </p>
                  </div>

                  {/* Developer */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <img src={assignment.developer.avatar} alt={assignment.developer.username} className="w-10 h-10 rounded-xl ring-1 ring-white/10" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{assignment.developer.username}</div>
                      <div className="text-xs text-white/35">
                        {assignment.developer.expertise} · {assignment.developer.experienceLevel} · Score: <span className="text-accent-cyan font-mono">{assignment.score}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                      <button
                        onClick={() => setExpandedStories(expandedStories === assignment.epic.epic_id ? null : assignment.epic.epic_id)}
                        className="btn-subtle text-xs py-1.5 px-3"
                      >
                        {expandedStories === assignment.epic.epic_id ? 'Hide' : 'Stories'}
                      </button>
                      <button
                        onClick={() => setExpandedScore(expandedScore === assignment.epic.epic_id ? null : assignment.epic.epic_id)}
                        className="btn-subtle text-xs py-1.5 px-3"
                      >
                        {expandedScore === assignment.epic.epic_id ? 'Hide' : 'Score'}
                      </button>
                      <select
                        value={assignment.developer.username}
                        onChange={(e) => handleReassign(assignment.epic.epic_id, e.target.value)}
                        className="input-dark text-xs py-1.5 px-2 w-auto"
                      >
                        <option value={assignment.developer.username}>{assignment.developer.username}</option>
                        {developers
                          .filter(d => d.username !== assignment.developer.username)
                          .map(dev => (
                            <option key={dev.username} value={dev.username}>
                              {dev.username} ({dev.analysis.expertise.primary})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Stories expanded */}
                  <AnimatePresence>
                    {expandedStories === assignment.epic.epic_id && assignment.epic.user_stories && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                          <div className="text-xs font-mono uppercase tracking-wider text-white/25 mb-2">
                            User Stories ({assignment.epic.user_stories.length})
                          </div>
                          {assignment.epic.user_stories.map((story, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <div className="flex items-start gap-2">
                                <span className="badge bg-indigo/15 text-indigo shrink-0">{story.story_id || `US-${idx + 1}`}</span>
                                <div className="flex-1">
                                  <div className="text-sm text-white/70">{story.story_title || 'Untitled Story'}</div>
                                  {story.story_points && <div className="text-xs text-white/30 mt-0.5">{story.story_points} points</div>}
                                  {story.acceptance_criteria && (
                                    <div className="mt-2">
                                      <div className="text-[10px] font-mono uppercase tracking-wider text-white/20 mb-1">Acceptance Criteria</div>
                                      <p className="text-xs text-white/40 whitespace-pre-wrap">{story.acceptance_criteria}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="text-xs text-white/30 pt-1">Total: {assignment.epic.totalStoryPoints} story points</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Score breakdown */}
                  <AnimatePresence>
                    {expandedScore === assignment.epic.epic_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <div className="text-xs font-mono uppercase tracking-wider text-white/25 mb-3">Score Breakdown</div>
                          <div className="space-y-2 text-sm">
                            {[
                              { label: 'Expertise Match', value: assignment.breakdown?.expertiseMatch, max: 50 },
                              { label: 'Experience Level', value: assignment.breakdown?.experienceLevel, max: 30 },
                              { label: 'Workload Balance', value: assignment.breakdown?.workloadBalance, max: 20 },
                            ].map((item, j) => (
                              <div key={j} className="flex items-center gap-3">
                                <span className="text-xs text-white/35 w-32">{item.label}</span>
                                <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-accent-cyan/40 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((item.value || 0) / item.max) * 100}%` }}
                                    transition={{ duration: 0.5, delay: j * 0.1 }}
                                  />
                                </div>
                                <span className="text-xs font-mono text-white/50 w-16 text-right">
                                  {Math.round(item.value || 0)}/{item.max}
                                </span>
                              </div>
                            ))}
                            <div className="pt-2 mt-1 border-t border-white/[0.04] flex justify-between">
                              <span className="text-xs font-medium text-white/50">Total</span>
                              <span className="text-sm font-bold text-accent-cyan font-mono">{assignment.score}/100</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Alternatives */}
                  {assignment.alternatives?.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/20">Alt:</span>
                      {assignment.alternatives.map((alt, j) => (
                        <motion.button
                          key={j}
                          onClick={() => handleReassign(assignment.epic.epic_id, alt.username)}
                          className="badge bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white/60 transition-colors cursor-pointer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {alt.username} ({alt.score})
                        </motion.button>
                      ))}
                    </div>
                  )}
                </SpotlightCard>
              </motion.div>
            );
          })}

          {filteredAndSortedAssignments.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">
              No assignments match your filters
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 items-center">
        <button onClick={previousStep} className="btn-ghost text-sm">Back</button>
        {assignments.length > 0 && (
          <div className="flex-1 text-center text-xs text-white/25">
            Assignment complete. Export or modify as needed.
          </div>
        )}
      </div>
    </div>
  );
}
