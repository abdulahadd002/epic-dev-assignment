import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { ArrowLeft, Plus, Minus, Loader2, UserCheck, RefreshCw, Clock, Calendar, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import SyncButton from '../../components/projects/SyncButton';

function suggestSprintCount(deadline, totalStories, totalPoints) {
  if (!deadline || !deadline.value) return 1;
  const v = parseInt(deadline.value) || 2;
  let totalDays;
  switch (deadline.unit) {
    case 'hours': totalDays = Math.max(1, Math.ceil(v / 24)); break;
    case 'days': totalDays = v; break;
    case 'months': totalDays = v * 30; break;
    case 'weeks':
    default: totalDays = v * 7; break;
  }

  // Standard sprint length: 2 weeks = 14 days
  const byDuration = Math.max(1, Math.round(totalDays / 14));
  // By complexity: ~8-12 stories per sprint is ideal
  const byStories = Math.max(1, Math.ceil(totalStories / 10));
  // By points: ~30-40 points per sprint is typical
  const byPoints = Math.max(1, Math.ceil(totalPoints / 35));

  // Take the median of the three suggestions
  const suggestions = [byDuration, byStories, byPoints].sort((a, b) => a - b);
  return Math.min(suggestions[1], 10); // Cap at 10 sprints
}

export default function AssignPage() {
  const { projectId } = useParams();
  const { getProject, isLoaded, setAssignments, updateEpic, updateStory, updateProject } = useProjects();
  const navigate = useNavigate();
  const project = getProject(projectId);

  const [githubUsernames, setGithubUsernames] = useState(['']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [developers, setDevelopers] = useState(project?.analyzedDevelopers || []);
  const [assignments, setLocalAssignments] = useState(project?.assignments || []);
  const [error, setError] = useState('');
  const [deadlineValue, setDeadlineValue] = useState(project?.deadline?.value || '');
  const [deadlineUnit, setDeadlineUnit] = useState(project?.deadline?.unit || 'weeks');
  const [sprintCount, setSprintCount] = useState(project?.sprintCount || 1);
  const [expandedEpics, setExpandedEpics] = useState({});

  useEffect(() => {
    if (isLoaded && !project) navigate('/projects');
  }, [isLoaded, project, navigate]);

  const approvedEpics = useMemo(() => project?.epics?.filter((e) => e.status === 'approved') || [], [project]);
  const totalStories = useMemo(() => approvedEpics.reduce((s, e) => s + (e.stories?.filter(st => st.status === 'approved').length || 0), 0), [approvedEpics]);
  const totalPoints = useMemo(() => approvedEpics.reduce((s, e) => s + (e.stories?.filter(st => st.status === 'approved').reduce((ss, st) => ss + (st.storyPoints || 5), 0) || 0), 0), [approvedEpics]);

  // Auto-suggest sprint count when deadline changes
  useEffect(() => {
    if (deadlineValue) {
      const suggested = suggestSprintCount({ value: deadlineValue, unit: deadlineUnit }, totalStories, totalPoints);
      setSprintCount(suggested);
    }
  }, [deadlineValue, deadlineUnit, totalStories, totalPoints]);

  if (!isLoaded || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const addUsername = () => setGithubUsernames((prev) => [...prev, '']);
  const removeUsername = (i) => setGithubUsernames((prev) => prev.filter((_, idx) => idx !== i));
  const setUsername = (i, val) => setGithubUsernames((prev) => prev.map((u, idx) => idx === i ? val : u));

  const toggleEpic = (epicId) => setExpandedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));

  const handleAnalyze = async () => {
    const usernames = githubUsernames.map((u) => u.trim()).filter(Boolean);
    if (usernames.length === 0) { setError('Enter at least one GitHub username.'); return; }
    setIsAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_usernames: usernames }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Analysis failed'); }
      const data = await res.json();
      setDevelopers(data.developers || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoAssign = async () => {
    if (developers.length === 0 || approvedEpics.length === 0) return;
    setIsAssigning(true);
    setError('');
    try {
      const epicPayload = approvedEpics.map((e) => ({
        epic_id: e.id,
        epic_title: e.title,
        description: e.description || '',
        user_stories: (e.stories || []).filter((s) => s.status === 'approved').map((s) => ({
          story_id: s.id,
          story_title: s.title,
          story_points: s.storyPoints || 5,
        })),
      }));

      const res = await fetch('/api/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epics: epicPayload, developers }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Assignment failed'); }
      const data = await res.json();
      const raw = data.assignments || data;
      // Story-level assignments: { epic, story, developer, score, confidence }
      const newAssignments = raw.map((a) => ({
        epic_id: a.epic?.epic_id,
        epic_title: a.epic?.epic_title,
        story_id: a.story?.story_id,
        story_title: a.story?.story_title,
        story_points: a.story?.story_points || 5,
        assigned_developer: a.developer?.username,
        score: a.score,
        confidence: a.confidence,
        alternatives: a.alternatives,
      }));
      setLocalAssignments(newAssignments);
      setAssignments(projectId, newAssignments, developers);
      // Auto-expand all epics to show story assignments
      const expanded = {};
      approvedEpics.forEach(e => { expanded[e.id] = true; });
      setExpandedEpics(expanded);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReassign = async (storyId, newDeveloperLogin) => {
    try {
      if (!newDeveloperLogin) return;
      const res = await fetch('/api/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story_id: storyId,
          new_developer: newDeveloperLogin,
          developers,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Reassign failed'); }
      const data = await res.json();
      setLocalAssignments((prev) =>
        prev.map((a) => (a.story_id === storyId)
          ? { ...a, assigned_developer: newDeveloperLogin, confidence: data.confidence || 'manual' }
          : a
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSyncComplete = (results, sprintId, jiraProjectKey, jiraBoardId) => {
    for (const result of results) {
      updateEpic(projectId, result.epicId, { jiraKey: result.epicKey });
      for (const story of result.stories) {
        updateStory(projectId, result.epicId, story.storyId, { jiraKey: story.storyKey });
      }
    }
    updateProject(projectId, {
      status: 'synced',
      deadline: { value: deadlineValue, unit: deadlineUnit },
      sprintCount,
      jiraSprintId: sprintId,
      jiraProjectKey,
      jiraBoardId,
    });
  };

  // Compute preview end date from deadline
  const deadlineEndDate = (() => {
    if (!deadlineValue || deadlineValue <= 0) return null;
    const d = new Date();
    const v = parseInt(deadlineValue);
    switch (deadlineUnit) {
      case 'hours': d.setHours(d.getHours() + v); break;
      case 'days': d.setDate(d.getDate() + v); break;
      case 'months': d.setMonth(d.getMonth() + v); break;
      case 'weeks':
      default: d.setDate(d.getDate() + v * 7); break;
    }
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  })();

  // Group assignments by epic for display
  const assignmentsByEpic = useMemo(() => {
    const grouped = {};
    for (const a of assignments) {
      const key = a.epic_id;
      if (!grouped[key]) grouped[key] = { epic_id: key, epic_title: a.epic_title, stories: [] };
      grouped[key].stories.push(a);
    }
    return Object.values(grouped);
  }, [assignments]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link to={`/projects/${projectId}/verify`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Verify
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assign Developers</h1>
        <p className="mt-1 text-sm text-gray-500">{project.name}</p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* GitHub Usernames */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">GitHub Usernames</h2>
        <div className="space-y-2">
          {githubUsernames.map((username, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(i, e.target.value)}
                placeholder={`GitHub username ${i + 1}`}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {githubUsernames.length > 1 && (
                <button onClick={() => removeUsername(i)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          {githubUsernames.length < 10 && (
            <button onClick={addUsername} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800">
              <Plus className="h-4 w-4" />
              Add Username
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze Developers'}
          </button>
        </div>
      </div>

      {/* Developer Cards */}
      {developers.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Developer Profiles</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {developers.map((dev) => (
              <div key={dev.login || dev.username} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-3 mb-3">
                  {dev.avatar_url && (
                    <img src={dev.avatar_url} alt={dev.login} className="h-10 w-10 rounded-full" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{dev.login || dev.username}</p>
                    <p className="text-xs text-gray-500">{dev.primary_expertise || dev.expertise}</p>
                  </div>
                </div>
                {dev.experience_level && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {dev.experience_level}
                  </span>
                )}
                {dev.top_skills && dev.top_skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dev.top_skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAutoAssign}
            disabled={isAssigning || approvedEpics.length === 0}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-gray-300"
          >
            {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isAssigning ? 'Auto-Assigning Stories...' : 'Auto-Assign Stories'}
          </button>
        </div>
      )}

      {/* Story-Level Assignment Table */}
      {assignments.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Story Assignments</h2>
            <span className="text-xs text-gray-500">{assignments.length} stories across {assignmentsByEpic.length} epics</span>
          </div>
          <div className="divide-y divide-gray-100">
            {assignmentsByEpic.map((group) => (
              <div key={group.epic_id}>
                {/* Epic header — collapsible */}
                <button
                  onClick={() => toggleEpic(group.epic_id)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  {expandedEpics[group.epic_id] ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  <span className="font-medium text-gray-800 text-sm">{group.epic_title}</span>
                  <span className="ml-auto text-xs text-gray-500">{group.stories.length} stories</span>
                </button>
                {/* Story rows */}
                {expandedEpics[group.epic_id] && (
                  <div className="divide-y divide-gray-50">
                    {group.stories.map((a) => (
                      <div key={a.story_id} className="flex items-center gap-3 px-6 py-2.5 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 truncate">{a.story_title}</p>
                          <span className="text-[10px] text-gray-400">{a.story_points} SP</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          {developers.find(d => (d.login || d.username) === a.assigned_developer)?.avatar_url && (
                            <img
                              src={developers.find(d => (d.login || d.username) === a.assigned_developer)?.avatar_url}
                              className="h-5 w-5 rounded-full"
                              alt=""
                            />
                          )}
                          <span className="text-gray-700 text-xs font-medium">{a.assigned_developer}</span>
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{a.score != null ? `${a.score}%` : '-'}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium w-16 text-center ${
                          a.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          a.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{a.confidence}</span>
                        <select
                          onChange={(e) => handleReassign(a.story_id, e.target.value)}
                          className="rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-blue-500 focus:outline-none w-28"
                          defaultValue=""
                        >
                          <option value="" disabled>Reassign...</option>
                          {developers.map((d) => (
                            <option key={d.login || d.username} value={d.login || d.username}>{d.login || d.username}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sprint Configuration */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          Sprint Configuration
        </h2>

        {/* Deadline */}
        <p className="mb-3 text-sm text-gray-500">Set the total project duration. Stories will be distributed across sprints.</p>
        <div className="flex items-center gap-3 mb-5">
          <label className="text-sm text-gray-600 w-20">Duration:</label>
          <input
            type="number"
            min="1"
            max="365"
            value={deadlineValue}
            onChange={(e) => setDeadlineValue(e.target.value)}
            placeholder="e.g. 2"
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={deadlineUnit}
            onChange={(e) => setDeadlineUnit(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
          </select>
          {deadlineEndDate && (
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              Ends: <span className="font-medium text-gray-900">{deadlineEndDate}</span>
            </span>
          )}
        </div>

        {/* Sprint count */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 w-20">Sprints:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={sprintCount}
            onChange={(e) => setSprintCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {deadlineValue && (
            <button
              onClick={() => {
                const suggested = suggestSprintCount({ value: deadlineValue, unit: deadlineUnit }, totalStories, totalPoints);
                setSprintCount(suggested);
              }}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Zap className="h-3 w-3" />
              Suggest optimal
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            ~{Math.ceil(totalStories / sprintCount)} stories / sprint
            {' · '}~{Math.round(totalPoints / sprintCount)} SP / sprint
          </span>
        </div>

        {sprintCount > 1 && deadlineValue && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.from({ length: sprintCount }, (_, i) => {
              const totalMs = (() => {
                const v = parseInt(deadlineValue) || 2;
                switch (deadlineUnit) {
                  case 'hours': return v * 60 * 60 * 1000;
                  case 'days': return v * 24 * 60 * 60 * 1000;
                  case 'months': return v * 30 * 24 * 60 * 60 * 1000;
                  case 'weeks':
                  default: return v * 7 * 24 * 60 * 60 * 1000;
                }
              })();
              const sprintMs = totalMs / sprintCount;
              const start = new Date(Date.now() + sprintMs * i);
              const end = new Date(Date.now() + sprintMs * (i + 1));
              const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-800">Sprint {i + 1}</span>
                  <span className="text-gray-400">·</span>
                  <span>{fmt(start)} – {fmt(end)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Jira Sync */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Sync to Jira</h2>
        <SyncButton
          epics={project.epics}
          assignments={assignments}
          deadline={deadlineValue ? { value: deadlineValue, unit: deadlineUnit } : null}
          projectName={project.name}
          sprintCount={sprintCount}
          onSyncComplete={handleSyncComplete}
        />
      </div>
    </div>
  );
}
