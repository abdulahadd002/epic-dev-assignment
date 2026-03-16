import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { ArrowLeft, Plus, Minus, Loader2, UserCheck, RefreshCw, Clock, Calendar } from 'lucide-react';
import SyncButton from '../../components/projects/SyncButton';

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

  useEffect(() => {
    if (isLoaded && !project) navigate('/projects');
  }, [isLoaded, project, navigate]);

  if (!isLoaded || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const approvedEpics = project.epics.filter((e) => e.status === 'approved');

  const addUsername = () => setGithubUsernames((prev) => [...prev, '']);
  const removeUsername = (i) => setGithubUsernames((prev) => prev.filter((_, idx) => idx !== i));
  const setUsername = (i, val) => setGithubUsernames((prev) => prev.map((u, idx) => idx === i ? val : u));

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
      const devs = data.developers || data;
      setDevelopers(devs);
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
      // Transform to epic-dev-assignment format
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
      // Backend returns nested: { assignments: [{ epic: {epic_id, ...}, developer: {username, ...}, score, confidence }] }
      // Flatten so UI can render a.epic_id, a.assigned_developer, etc.
      const raw = data.assignments || data;
      const newAssignments = raw.map((a) => ({
        epic_id: a.epic?.epic_id || a.epic_id,
        epic_title: a.epic?.epic_title || a.epic_title,
        assigned_developer: a.developer?.username || a.assigned_developer,
        score: a.score,
        confidence: a.confidence,
        alternatives: a.alternatives,
      }));
      setLocalAssignments(newAssignments);
      setAssignments(projectId, newAssignments, developers);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleReassign = async (epicId, newDeveloperLogin) => {
    try {
      if (!newDeveloperLogin) return;
      const res = await fetch('/api/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epic_id: epicId,
          new_developer: newDeveloperLogin,
          developers,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Reassign failed'); }
      const data = await res.json();
      setLocalAssignments((prev) =>
        prev.map((a) => (a.epic_id === epicId)
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
            {isAssigning ? 'Auto-Assigning...' : 'Auto-Assign Epics'}
          </button>
        </div>
      )}

      {/* Assignment Table */}
      {assignments.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <h2 className="px-6 py-4 text-base font-semibold text-gray-900 border-b border-gray-100">Epic Assignments</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Epic</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Developer</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Score</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Confidence</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Reassign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assignments.map((a) => (
                  <tr key={a.epic_id || a.epicId}>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.epic_title || a.epicTitle}</td>
                    <td className="px-4 py-3 text-gray-700">{a.assigned_developer || a.developer}</td>
                    <td className="px-4 py-3 text-gray-500">{a.score != null ? `${Math.round(a.score * 100)}%` : '-'}</td>
                    <td className="px-4 py-3">
                      {a.confidence && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.confidence === 'high' ? 'bg-green-100 text-green-700' :
                          a.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>{a.confidence}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        onChange={(e) => handleReassign(a.epic_id || a.epicId, e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Reassign...</option>
                        {developers.map((d) => (
                          <option key={d.login} value={d.login}>{d.login}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sprint Deadline */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          Sprint Deadline
        </h2>
        <p className="mb-4 text-sm text-gray-500">Set the duration for this sprint before syncing to Jira.</p>
        <div className="flex items-center gap-3">
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
      </div>

      {/* Jira Sync */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Sync to Jira</h2>
        <SyncButton
          epics={project.epics}
          assignments={assignments}
          deadline={deadlineValue ? { value: deadlineValue, unit: deadlineUnit } : null}
          projectName={project.name}
          onSyncComplete={handleSyncComplete}
        />
      </div>
    </div>
  );
}
