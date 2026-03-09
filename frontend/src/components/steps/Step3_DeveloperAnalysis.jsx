import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { useThemeContext } from '../../App';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Users, Loader2, ChevronDown } from 'lucide-react';
import SpotlightCard from '../shared/SpotlightCard';
import { SkeletonDevCard } from '../shared/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const COLORS = ['#34D399', '#F87171'];
const FILE_COLORS = ['#70E6ED', '#A78BFA', '#34D399', '#FBBF24', '#F87171', '#6B7280', '#14B8A6', '#818CF8'];

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

export default function Step3_DeveloperAnalysis() {
  const { developers, setDevelopers, nextStep, previousStep } = useWorkflow();
  const { isDark } = useThemeContext();

  const chartGrid = isDark ? '#1a1a1a' : 'rgba(0,0,0,0.06)';
  const chartTick = { fontSize: 10, fill: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(28,25,23,0.4)' };
  const chartTooltip = {
    contentStyle: {
      background: isDark ? '#111' : '#F2F0EB',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: '10px', fontSize: '12px',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.08)'
    },
    itemStyle: { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(28,25,23,0.7)' },
    labelStyle: { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(28,25,23,0.4)' }
  };

  const [devInputs, setDevInputs] = useState([{ username: '', owner: '', repo: '' }]);
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

      const text = await response.text();
      if (!text) throw new Error('Empty response from server. Please try again.');
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Invalid response from server. Please try again.'); }
      if (!data.success) throw new Error(data.error || 'Failed to analyze developers');

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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Input Section */}
      <SpotlightCard className="p-6 space-y-5">
        <div>
          <h2 className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-cyan" />
            Analyze Developers
          </h2>
          <p className="text-white/40 text-sm mt-1">
            Enter GitHub usernames to analyze developer expertise from commit history
          </p>
        </div>

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
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing developers...
              </span>
            ) : (
              'Analyze Developers'
            )}
          </motion.button>
        </div>

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
      {loading && developers.length === 0 && (
        <div className="space-y-3">
          {devInputs.filter(d => d.username.trim()).map((_, i) => (
            <SkeletonDevCard key={i} />
          ))}
        </div>
      )}

      {/* Results */}
      {developers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-white/30 text-xs font-mono uppercase tracking-wider">
            Analysis Results ({developers.length} developers)
          </h3>

          {developers.map((dev, index) => {
            const tone = toneColors[dev.analysis.experienceLevel.tone] || toneColors.blue;

            return (
              <motion.div
                key={index}
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
                        src={dev.avatar}
                        alt={dev.username}
                        className="w-14 h-14 rounded-xl ring-1 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-semibold text-white">{dev.username}</h4>
                          <span className={`badge ${tone.bg} ${tone.text}`}>
                            {dev.analysis.experienceLevel.level}
                          </span>
                          <span className="badge bg-white/[0.05] text-white/50">
                            {dev.analysis.expertise.primaryIcon} {dev.analysis.expertise.primary}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-3">
                          {[
                            { label: 'Commits', value: dev.analysis.totalCommits },
                            { label: 'On-Time', value: `${dev.analysis.onTimePercentage}%` },
                            { label: 'Consistency', value: dev.analysis.consistencyScore },
                            { label: 'Avg Size', value: `${dev.analysis.avgCommitSize} ln` },
                          ].map((stat, i) => (
                            <div key={i}>
                              <div className="stat-label">{stat.label}</div>
                              <div className="text-sm font-semibold text-white">{stat.value}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {dev.analysis.expertise.all.slice(0, 4).map((exp, i) => (
                            <span key={i} className="badge bg-white/[0.04] text-white/40">
                              {exp.icon} {exp.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        onClick={() => toggleExpand(index)}
                        className="btn-subtle text-xs shrink-0 flex items-center gap-1"
                        whileTap={{ scale: 0.95 }}
                      >
                        {expandedDev === index ? 'Hide' : 'Details'}
                        <motion.div animate={{ rotate: expandedDev === index ? 180 : 0 }}>
                          <ChevronDown className="w-3 h-3" />
                        </motion.div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Expanded Charts */}
                  <AnimatePresence>
                    {expandedDev === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-white/[0.04] pt-5 space-y-5">
                          {/* Experience banner */}
                          <div className="rounded-2xl bg-gradient-to-r from-accent-cyan/10 to-purple/10 border border-white/[0.06] p-5">
                            <div className="text-xs font-mono uppercase tracking-wider text-white/30 mb-2">Experience Level</div>
                            <div className="text-xl font-bold text-white mb-3">{dev.analysis.experienceLevel.level}</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="stat-label">Lines Changed</div>
                                <div className="text-sm font-semibold text-white">
                                  <span className="text-success">+{dev.analysis.totalLinesAdded.toLocaleString()}</span>
                                  {' / '}
                                  <span className="text-danger">-{dev.analysis.totalLinesDeleted.toLocaleString()}</span>
                                </div>
                              </div>
                              <div>
                                <div className="stat-label">Avg Commit Size</div>
                                <div className="text-sm font-semibold text-white">{dev.analysis.avgCommitSize} lines</div>
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
                                  <Bar dataKey="count" fill="#70E6ED" radius={[4, 4, 0, 0]} />
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
                                  <Line type="monotone" dataKey="days" stroke="#A78BFA" strokeWidth={2} dot={false} />
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
                                <Bar dataKey="commits" fill="#FBBF24" radius={[4, 4, 0, 0]} />
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
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
      <div className="text-xs font-mono uppercase tracking-wider text-white/25 mb-3">{title}</div>
      {children}
    </div>
  );
}
