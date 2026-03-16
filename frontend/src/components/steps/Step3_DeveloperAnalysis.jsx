import { useState, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { useDevelopers } from '../../hooks/useDevelopers';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Users, Loader2, ChevronDown, Check, UserPlus } from 'lucide-react';
import SpotlightCard from '../shared/SpotlightCard';
import { SkeletonDevCard } from '../shared/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const COLORS = ['#34D399', '#F87171'];
const FILE_COLORS = ['#0EA5B0', '#7C5DC7', '#34D399', '#B45309', '#F87171', '#6B7280', '#14B8A6', '#818CF8'];

const toneColors = {
  purple: { bg: 'bg-purple/15', text: 'text-purple' },
  blue: { bg: 'bg-blue/15', text: 'text-blue' },
  green: { bg: 'bg-green/15', text: 'text-green' },
  yellow: { bg: 'bg-warning/15', text: 'text-warning' },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  })
};

const chartGrid = 'var(--border-subtle)';
const chartTick = { fontSize: 10, fill: 'var(--text-tertiary)' };
const chartTooltip = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-card)',
    borderRadius: '10px', fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
  },
  itemStyle: { color: 'var(--text-primary)' },
  labelStyle: { color: 'var(--text-secondary)' }
};

export default function Step3_DeveloperAnalysis() {
  const { developers, setDevelopers, nextStep, previousStep } = useWorkflow();
  const { developers: rosterDevs } = useDevelopers();

  // Track which roster devs are selected
  const [selectedRoster, setSelectedRoster] = useState(() => {
    const set = new Set();
    for (const d of developers) {
      if (rosterDevs.some((r) => r.username === d.username)) {
        set.add(d.username);
      }
    }
    return set;
  });

  // New developer analysis inputs
  const [showNewForm, setShowNewForm] = useState(false);
  const [devInputs, setDevInputs] = useState([{ username: '', owner: '', repo: '' }]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState(null);
  const [expandedDev, setExpandedDev] = useState(null);

  // Newly analyzed devs (not from roster)
  const [freshAnalyzed, setFreshAnalyzed] = useState(() => {
    return developers.filter((d) => !rosterDevs.some((r) => r.username === d.username));
  });

  // Merge selected roster devs + freshly analyzed into workflow developers
  const mergedDevelopers = useMemo(() => {
    const selected = rosterDevs.filter((r) => selectedRoster.has(r.username));
    const seen = new Set();
    const merged = [];
    for (const d of selected) {
      if (!seen.has(d.username)) { merged.push(d); seen.add(d.username); }
    }
    for (const d of freshAnalyzed) {
      if (!seen.has(d.username)) { merged.push(d); seen.add(d.username); }
    }
    return merged;
  }, [rosterDevs, selectedRoster, freshAnalyzed]);

  const toggleRosterDev = (username) => {
    setSelectedRoster((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

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

    const toAnalyze = validInputs.filter(
      (d) => !rosterDevs.some((r) => r.username === d.username.trim())
    );
    const alreadyInRoster = validInputs.filter(
      (d) => rosterDevs.some((r) => r.username === d.username.trim())
    );

    if (alreadyInRoster.length > 0) {
      setSelectedRoster((prev) => {
        const next = new Set(prev);
        alreadyInRoster.forEach((d) => next.add(d.username.trim()));
        return next;
      });
    }

    if (toAnalyze.length === 0) {
      setDevInputs([{ username: '', owner: '', repo: '' }]);
      setShowNewForm(false);
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingProgress('Connecting to GitHub...');

    const progressSteps = [
      { delay: 3000, msg: 'Fetching repositories...' },
      { delay: 8000, msg: 'Analyzing commit history...' },
      { delay: 15000, msg: 'Detecting expertise from file patterns...' },
      { delay: 25000, msg: 'Calculating experience levels...' },
      { delay: 40000, msg: 'Processing detailed commit data...' },
      { delay: 60000, msg: 'Almost done, finalizing analysis...' },
    ];
    const timers = progressSteps.map(({ delay, msg }) =>
      setTimeout(() => setLoadingProgress(msg), delay)
    );

    try {
      const response = await fetch('/api/analyze-developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developers: toAnalyze })
      });

      const text = await response.text();
      if (!text) throw new Error('Empty response from server. Please try again.');
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Invalid response from server. Please try again.'); }
      if (!data.success) throw new Error(data.error || 'Failed to analyze developers');

      if (data.developers.length === 0 && alreadyInRoster.length === 0) {
        setError('No developers could be analyzed. Check usernames and try again.');
      } else {
        setFreshAnalyzed((prev) => {
          const seen = new Set(prev.map((d) => d.username));
          const added = data.developers.filter((d) => !seen.has(d.username));
          return [...prev, ...added];
        });
        setDevInputs([{ username: '', owner: '', repo: '' }]);
        setShowNewForm(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      timers.forEach(clearTimeout);
      setLoading(false);
      setLoadingProgress('');
    }
  };

  const handleProceed = () => {
    if (mergedDevelopers.length === 0) {
      setError('Please select or analyze at least one developer before proceeding');
      return;
    }
    setDevelopers(mergedDevelopers);
    nextStep();
  };

  const removeFreshDev = (username) => {
    setFreshAnalyzed((prev) => prev.filter((d) => d.username !== username));
  };

  const toggleExpand = (index) => {
    setExpandedDev(expandedDev === index ? null : index);
  };

  const allDisplayDevs = mergedDevelopers;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Roster Selection */}
      {rosterDevs.length > 0 && (
        <SpotlightCard className="p-6 space-y-4">
          <div>
            <h2 className="text-heading flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-cyan" />
              Select from Team Roster
            </h2>
            <p className="text-muted text-sm mt-1">
              These developers are already analyzed. Click to select them for this project.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rosterDevs.map((dev) => {
              const isSelected = selectedRoster.has(dev.username);
              return (
                <motion.button
                  key={dev.username}
                  onClick={() => toggleRosterDev(dev.username)}
                  className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 border ${
                    isSelected
                      ? 'bg-accent-cyan/10 border-accent-cyan/30'
                      : 'bg-card-theme border-default hover:bg-[var(--bg-card-hover)]'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative">
                    <img
                      src={dev.avatar_url || dev.avatar || `https://github.com/${dev.username}.png`}
                      alt={dev.username}
                      className="w-10 h-10 rounded-lg ring-1 ring-default"
                    />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-cyan flex items-center justify-center">
                        <Check className="w-3 h-3" style={{ color: '#fff' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-heading truncate">{dev.username}</span>
                      {dev.experience_level && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-card-theme text-subtle">
                          {dev.experience_level}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-subtle truncate block">
                      {dev.primary_expertise || 'Full Stack'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="text-xs text-faint">
            {selectedRoster.size} of {rosterDevs.length} selected
          </div>
        </SpotlightCard>
      )}

      {/* Analyze New Developers */}
      <SpotlightCard className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-heading flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-accent-cyan" />
              {rosterDevs.length > 0 ? 'Analyze New Developer' : 'Analyze Developers'}
            </h2>
            <p className="text-muted text-sm mt-1">
              {rosterDevs.length > 0
                ? 'Add a new developer not yet in your roster'
                : 'Enter GitHub usernames to analyze developer expertise from commit history'}
            </p>
          </div>
          {rosterDevs.length > 0 && !showNewForm && (
            <motion.button
              onClick={() => setShowNewForm(true)}
              className="btn-ghost text-sm flex items-center gap-1.5"
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-4 h-4" /> Add New
            </motion.button>
          )}
        </div>

        {(showNewForm || rosterDevs.length === 0) && (
          <>
            <div className="space-y-3">
              {devInputs.map((dev, index) => (
                <motion.div
                  key={index}
                  className="flex gap-2"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <input
                    type="text"
                    placeholder="GitHub Username *"
                    value={dev.username}
                    onChange={(e) => updateDeveloperInput(index, 'username', e.target.value)}
                    className="input-dark flex-1"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    placeholder="Owner (optional)"
                    value={dev.owner}
                    onChange={(e) => updateDeveloperInput(index, 'owner', e.target.value)}
                    className="input-dark flex-1"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    placeholder="Repository (optional)"
                    value={dev.repo}
                    onChange={(e) => updateDeveloperInput(index, 'repo', e.target.value)}
                    className="input-dark flex-1"
                    disabled={loading}
                  />
                  {devInputs.length > 1 && (
                    <motion.button
                      onClick={() => removeDeveloperInput(index)}
                      disabled={loading}
                      className="w-10 h-10 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-colors flex items-center justify-center shrink-0"
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={addDeveloperInput}
                disabled={loading || devInputs.length >= 10}
                className="btn-ghost text-sm disabled:opacity-40 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Developer
              </button>
              <motion.button
                onClick={handleAnalyze}
                disabled={loading}
                className="btn-accent flex-1 text-sm flex items-center justify-center"
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {loadingProgress || 'Analyzing developers...'}
                  </span>
                ) : (
                  'Analyze & Add'
                )}
              </motion.button>
            </div>
          </>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-danger/10 border border-danger/20"
          >
            <p className="text-danger text-sm">{error}</p>
          </motion.div>
        )}
      </SpotlightCard>

      {/* Loading skeletons */}
      {loading && allDisplayDevs.length === 0 && (
        <div className="space-y-3">
          {devInputs.filter(d => d.username.trim()).map((_, i) => (
            <SkeletonDevCard key={i} />
          ))}
        </div>
      )}

      {/* Results — selected roster + freshly analyzed */}
      {allDisplayDevs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-subtle text-xs font-mono uppercase tracking-wider">
            Selected Developers ({allDisplayDevs.length})
          </h3>

          {allDisplayDevs.map((dev, index) => {
            const tone = toneColors[dev.analysis?.experienceLevel?.tone] || toneColors.blue;
            const isFromRoster = rosterDevs.some((r) => r.username === dev.username);

            return (
              <motion.div
                key={dev.username}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="show"
              >
                <SpotlightCard className="overflow-hidden">
                  {/* Summary */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <img
                        src={dev.avatar_url || dev.avatar || `https://github.com/${dev.username}.png`}
                        alt={dev.username}
                        className="w-14 h-14 rounded-xl ring-1 ring-default"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-heading">{dev.username}</h4>
                          {isFromRoster && (
                            <span className="badge bg-accent-cyan/15 text-accent-cyan text-[10px]">
                              From Roster
                            </span>
                          )}
                          {dev.analysis?.experienceLevel && (
                            <span className={`badge ${tone.bg} ${tone.text}`}>
                              {dev.analysis.experienceLevel.level}
                            </span>
                          )}
                          {dev.analysis?.expertise && (
                            <span className="badge bg-card-theme text-muted">
                              {dev.analysis.expertise.primaryIcon} {dev.analysis.expertise.primary}
                            </span>
                          )}
                        </div>

                        {dev.analysis?.totalCommits != null && (
                          <div className="grid grid-cols-4 gap-4 mt-3">
                            {[
                              { label: 'Commits', value: dev.analysis.totalCommits },
                              { label: 'On-Time', value: `${dev.analysis.onTimePercentage}%` },
                              { label: 'Consistency', value: dev.analysis.consistencyScore },
                              { label: 'Avg Size', value: `${dev.analysis.avgCommitSize} ln` },
                            ].map((stat, i) => (
                              <div key={i}>
                                <div className="stat-label">{stat.label}</div>
                                <div className="text-sm font-semibold text-heading">{stat.value}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {dev.analysis?.expertise?.all && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {dev.analysis.expertise.all.slice(0, 4).map((exp, i) => (
                              <span key={i} className="badge bg-card-theme text-subtle">
                                {exp.icon} {exp.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {dev.analysis?.totalCommits != null && (
                          <motion.button
                            onClick={() => toggleExpand(index)}
                            className="btn-subtle text-xs flex items-center gap-1"
                            whileTap={{ scale: 0.95 }}
                          >
                            {expandedDev === index ? 'Hide' : 'Details'}
                            <motion.div animate={{ rotate: expandedDev === index ? 180 : 0 }}>
                              <ChevronDown className="w-3 h-3" />
                            </motion.div>
                          </motion.button>
                        )}
                        {!isFromRoster && (
                          <motion.button
                            onClick={() => removeFreshDev(dev.username)}
                            className="btn-subtle text-xs text-danger/70 hover:text-danger"
                            whileTap={{ scale: 0.95 }}
                          >
                            <X className="w-3 h-3" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Charts */}
                  <AnimatePresence>
                    {expandedDev === index && dev.analysis && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-5 space-y-5" style={{ borderTop: '1px solid var(--border-card)' }}>
                          {/* Experience banner */}
                          <div className="rounded-2xl bg-gradient-to-r from-accent-cyan/10 to-purple/10 border border-default p-5">
                            <div className="text-xs font-mono uppercase tracking-wider text-subtle mb-2">Experience Level</div>
                            <div className="text-xl font-bold text-heading mb-3">{dev.analysis.experienceLevel.level}</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="stat-label">Lines Changed</div>
                                <div className="text-sm font-semibold">
                                  <span className="text-success">+{dev.analysis.totalLinesAdded.toLocaleString()}</span>
                                  {' / '}
                                  <span className="text-danger">-{dev.analysis.totalLinesDeleted.toLocaleString()}</span>
                                </div>
                              </div>
                              <div>
                                <div className="stat-label">Avg Commit Size</div>
                                <div className="text-sm font-semibold text-heading">{dev.analysis.avgCommitSize} lines</div>
                              </div>
                            </div>
                          </div>

                          {/* Chart row 1 */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ChartCard title="File Types">
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie data={dev.analysis.fileTypes} cx="50%" cy="50%" labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={65} fill="#8884d8" dataKey="value"
                                  >
                                    {dev.analysis.fileTypes.map((_, i) => (
                                      <Cell key={`cell-${i}`} fill={FILE_COLORS[i % FILE_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip {...chartTooltip} />
                                </PieChart>
                              </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Commit Sizes">
                              <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={dev.analysis.commitSizeDistribution}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                  <XAxis dataKey="range" tick={chartTick} />
                                  <YAxis tick={chartTick} />
                                  <Tooltip {...chartTooltip} />
                                  <Bar dataKey="count" fill="#0EA5B0" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Commit Frequency">
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={dev.analysis.consistencyTimeline}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                  <XAxis dataKey="commit" tick={chartTick} />
                                  <YAxis tick={chartTick} />
                                  <Tooltip {...chartTooltip} />
                                  <Line type="monotone" dataKey="days" stroke="#7C5DC7" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </ChartCard>
                          </div>

                          {/* Chart row 2 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ChartCard title="On-Time vs Late">
                              <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'On-Time', value: dev.analysis.onTimeCount },
                                      { name: 'Late', value: dev.analysis.lateCount },
                                    ]}
                                    cx="50%" cy="50%" labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80} fill="#8884d8" dataKey="value"
                                  >
                                    {COLORS.map((color, i) => (
                                      <Cell key={`cell-${i}`} fill={color} />
                                    ))}
                                  </Pie>
                                  <Tooltip {...chartTooltip} />
                                </PieChart>
                              </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Weekday Activity">
                              <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={dev.analysis.weekdayData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                  <XAxis dataKey="day" tick={chartTick} />
                                  <YAxis tick={chartTick} />
                                  <Tooltip {...chartTooltip} />
                                  <Bar dataKey="commits" fill="#34D399" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </ChartCard>
                          </div>

                          {/* Hourly */}
                          <ChartCard title="Hourly Activity">
                            <ResponsiveContainer width="100%" height={220}>
                              <BarChart data={dev.analysis.hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                                <XAxis dataKey="hour" tick={chartTick} angle={-45} textAnchor="end" height={70} />
                                <YAxis tick={chartTick} />
                                <Tooltip {...chartTooltip} />
                                <Bar dataKey="commits" fill="#B45309" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartCard>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SpotlightCard>
              </motion.div>
            );
          })}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <button onClick={previousStep} className="btn-ghost text-sm">Back</button>
            <motion.button
              onClick={handleProceed}
              className="btn-accent flex-1 text-sm"
              whileTap={{ scale: 0.98 }}
            >
              Proceed to Assignment
            </motion.button>
          </div>
        </div>
      )}

      {/* Navigation when no devs selected yet */}
      {allDisplayDevs.length === 0 && (
        <div className="flex gap-3 pt-2">
          <button onClick={previousStep} className="btn-ghost text-sm">Back</button>
          <motion.button
            onClick={handleProceed}
            className="btn-accent flex-1 text-sm opacity-50"
            whileTap={{ scale: 0.98 }}
          >
            Proceed to Assignment
          </motion.button>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl bg-card-theme border border-default p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-faint mb-3">{title}</div>
      {children}
    </div>
  );
}
