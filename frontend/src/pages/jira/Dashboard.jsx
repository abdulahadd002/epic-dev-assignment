import { useMemo } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { useDevelopers } from '../../hooks/useDevelopers';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderOpen, Users, BookOpen, Layers, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, BarChart3, ExternalLink, GitBranch, Target, Zap, Activity
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    teal: 'bg-teal-50 text-teal-600',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-4"
    >
      <div className={`mb-2 inline-flex rounded-lg p-2 ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </motion.div>
  );
}

function ProjectCard({ project }) {
  const statusColors = {
    'epics-ready': 'bg-blue-100 text-blue-700',
    'stories-ready': 'bg-purple-100 text-purple-700',
    assigned: 'bg-amber-100 text-amber-700',
    synced: 'bg-emerald-100 text-emerald-700',
  };
  const statusLabels = {
    'epics-ready': 'Epics Ready',
    'stories-ready': 'Stories Ready',
    assigned: 'Assigned',
    synced: 'Synced to Jira',
  };

  const epicCount = project.epics?.length || 0;
  const storyCount = project.epics?.reduce((s, e) => s + (e.stories?.length || 0), 0) || 0;
  const approvedEpics = project.epics?.filter(e => e.status === 'approved').length || 0;
  const assignmentCount = project.assignments?.length || 0;
  const totalPoints = project.epics?.reduce((s, e) =>
    s + (e.stories?.reduce((ss, st) => ss + (st.storyPoints || 0), 0) || 0), 0) || 0;
  const progress = storyCount > 0 ? Math.round((assignmentCount / storyCount) * 100) : 0;

  return (
    <Link to={`/projects/${project.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-600'}`}>
                {statusLabels[project.status] || project.status || 'Draft'}
              </span>
              {project.jiraProjectKey && (
                <span className="text-[10px] font-mono text-gray-400">{project.jiraProjectKey}</span>
              )}
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>{assignmentCount}/{storyCount} assigned</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {epicCount} epics</span>
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {storyCount} stories</span>
          <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {totalPoints} SP</span>
        </div>

        {project.deadline && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="h-3 w-3" />
            {project.deadline.value} {project.deadline.unit}
            {project.sprintCount > 1 && ` · ${project.sprintCount} sprints`}
          </div>
        )}
      </motion.div>
    </Link>
  );
}

export default function Dashboard() {
  const { projects } = useProjects();
  const { developers } = useDevelopers();

  const stats = useMemo(() => {
    let totalEpics = 0, totalStories = 0, totalPoints = 0, totalAssignments = 0;
    let approvedEpics = 0, syncedProjects = 0, assignedProjects = 0;
    const devWorkload = {};

    for (const p of projects) {
      const epics = p.epics || [];
      totalEpics += epics.length;
      approvedEpics += epics.filter(e => e.status === 'approved').length;

      for (const e of epics) {
        const stories = e.stories || [];
        totalStories += stories.length;
        totalPoints += stories.reduce((s, st) => s + (st.storyPoints || 0), 0);
      }

      totalAssignments += (p.assignments || []).length;
      if (p.status === 'synced') syncedProjects++;
      if (p.assignments?.length > 0) assignedProjects++;

      for (const a of (p.assignments || [])) {
        const dev = a.assigned_developer;
        if (dev) {
          if (!devWorkload[dev]) devWorkload[dev] = { stories: 0, points: 0, projects: new Set() };
          devWorkload[dev].stories++;
          devWorkload[dev].points += a.story_points || a.storyPoints || 0;
          devWorkload[dev].projects.add(p.id);
        }
      }
    }

    // Convert Sets to counts
    const devWorkloadList = Object.entries(devWorkload)
      .map(([username, data]) => ({ username, stories: data.stories, points: data.points, projectCount: data.projects.size }))
      .sort((a, b) => b.stories - a.stories);

    return {
      totalProjects: projects.length,
      totalEpics,
      approvedEpics,
      totalStories,
      totalPoints,
      totalAssignments,
      syncedProjects,
      assignedProjects,
      totalDevelopers: developers.length,
      devWorkloadList,
    };
  }, [projects, developers]);

  const recentProjects = useMemo(() =>
    [...projects].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6),
    [projects]
  );

  const syncedProjects = useMemo(() => projects.filter(p => p.status === 'synced'), [projects]);

  const assignmentRate = stats.totalStories > 0
    ? Math.round((stats.totalAssignments / stats.totalStories) * 100)
    : 0;

  const approvalRate = stats.totalEpics > 0
    ? Math.round((stats.approvedEpics / stats.totalEpics) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of all projects, teams, and workflow progress</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={FolderOpen} label="Projects" value={stats.totalProjects} sub={`${stats.syncedProjects} synced`} color="blue" />
        <StatCard icon={Layers} label="Epics" value={stats.totalEpics} sub={`${stats.approvedEpics} approved`} color="purple" />
        <StatCard icon={BookOpen} label="Stories" value={stats.totalStories} sub={`${stats.totalPoints} SP total`} color="teal" />
        <StatCard icon={Users} label="Team" value={stats.totalDevelopers} sub="in roster" color="amber" />
        <StatCard icon={CheckCircle2} label="Assigned" value={stats.totalAssignments} sub={`${assignmentRate}% coverage`} color="green" />
        <StatCard icon={GitBranch} label="Jira Synced" value={stats.syncedProjects} sub={`of ${stats.totalProjects}`} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Workflow Progress */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-500" />
            Workflow Progress
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Epic Approval Rate</span>
                <span className="font-medium">{approvalRate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${approvalRate}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full bg-purple-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{stats.approvedEpics} of {stats.totalEpics} epics approved</p>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Story Assignment Coverage</span>
                <span className="font-medium">{assignmentRate}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${assignmentRate}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="h-full rounded-full bg-teal-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{stats.totalAssignments} of {stats.totalStories} stories assigned</p>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Jira Sync Rate</span>
                <span className="font-medium">{stats.totalProjects > 0 ? Math.round((stats.syncedProjects / stats.totalProjects) * 100) : 0}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.totalProjects > 0 ? (stats.syncedProjects / stats.totalProjects) * 100 : 0}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="h-full rounded-full bg-blue-500"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">{stats.syncedProjects} of {stats.totalProjects} projects synced to Jira</p>
            </div>
          </div>
        </div>

        {/* Team Workload */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            Team Workload
          </h2>
          {stats.devWorkloadList.length > 0 ? (
            <div className="space-y-3">
              {stats.devWorkloadList.slice(0, 8).map((dev, i) => {
                const rosterDev = developers.find(d => d.username === dev.username);
                const maxStories = stats.devWorkloadList[0]?.stories || 1;
                return (
                  <motion.div
                    key={dev.username}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    {rosterDev?.avatar_url || rosterDev?.avatar ? (
                      <img src={rosterDev.avatar_url || rosterDev.avatar} className="h-6 w-6 rounded-full flex-shrink-0" alt="" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                        {dev.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700 truncate">{dev.username}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                          {dev.stories} {dev.stories === 1 ? 'story' : 'stories'} · {dev.points} SP
                        </span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-gray-100 mt-1">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${(dev.stories / maxStories) * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No assignments yet</p>
          )}
        </div>
      </div>

      {/* Jira-synced projects */}
      {syncedProjects.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            Active Jira Projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {syncedProjects.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    {p.jiraProjectKey && <span className="font-mono">{p.jiraProjectKey}</span>}
                    {p.sprintCount && <span>· {p.sprintCount} sprint{p.sprintCount > 1 ? 's' : ''}</span>}
                    {p.assignments && <span>· {p.assignments.length} tasks</span>}
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            {projects.length > 6 ? 'Recent Projects' : 'All Projects'}
          </h2>
          {projects.length > 6 && (
            <Link to="/projects" className="text-xs text-blue-600 hover:text-blue-800">View all</Link>
          )}
        </div>
        {recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentProjects.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ProjectCard project={p} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FolderOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No projects yet</p>
            <Link to="/projects/new" className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              Create your first project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
