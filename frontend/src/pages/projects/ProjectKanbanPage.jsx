import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { useSprintIssues } from '../../hooks/useSprintData';
import { ArrowLeft, Columns3, RefreshCw, GripVertical, Flame, Search, Filter, X } from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function normalizeStatus(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'Done';
  if (s.includes('progress') || s.includes('review')) return 'In Progress';
  return 'To Do';
}

const colConfig = {
  'To Do': {
    header: 'bg-gray-50 border-gray-200',
    dot: 'bg-gray-400',
    textColor: 'text-gray-600',
    dropHighlight: 'bg-gray-100 ring-gray-300',
    card: { bg: 'bg-white', border: 'border-gray-200 hover:border-gray-300', accent: 'border-l-gray-400', key: 'text-gray-500', sp: 'bg-gray-100 text-gray-600', grip: 'text-gray-300' },
  },
  'In Progress': {
    header: 'bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    textColor: 'text-blue-600',
    dropHighlight: 'bg-blue-50 ring-blue-300',
    card: { bg: 'bg-blue-50/40', border: 'border-blue-200 hover:border-blue-300', accent: 'border-l-blue-500', key: 'text-blue-600', sp: 'bg-blue-100 text-blue-600', grip: 'text-blue-300' },
  },
  'Done': {
    header: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    dropHighlight: 'bg-emerald-50 ring-emerald-300',
    card: { bg: 'bg-emerald-50/40', border: 'border-emerald-200 hover:border-emerald-300', accent: 'border-l-emerald-500', key: 'text-emerald-600', sp: 'bg-emerald-100 text-emerald-600', grip: 'text-emerald-300' },
  },
};

function KanbanCard({ issue, column, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.key,
    data: { issue },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
  };

  const cc = colConfig[column]?.card || colConfig['To Do'].card;

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? {} : style}
      {...attributes}
      {...listeners}
      className={`rounded-lg border border-l-[3px] p-3 cursor-grab active:cursor-grabbing transition-all ${cc.accent} ${cc.bg} ${
        isDragOverlay ? 'shadow-xl ring-2 ring-teal-300 border-teal-400' : cc.border
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className={`w-4 h-4 mt-0.5 shrink-0 ${cc.grip}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono font-medium ${cc.key}`}>{issue.key}</span>
            {(issue.priority === 'Blocker' || issue.priority === 'Critical') && (
              <Flame className="w-3.5 h-3.5 text-red-500" />
            )}
            {issue.issueType && (
              <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{issue.issueType}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 leading-snug">{issue.summary}</p>
          {issue.epicName && (
            <p className="text-xs text-purple-600 mt-1">{issue.epicName}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {issue.storyPoints != null && (
              <span className={`text-xs font-mono rounded px-1.5 py-0.5 ${cc.sp}`}>{issue.storyPoints} SP</span>
            )}
            {issue.assignee?.name && (
              <span className="text-xs rounded bg-teal-100 text-teal-700 px-1.5 py-0.5">{issue.assignee.name}</span>
            )}
            {issue.priority && issue.priority !== 'Medium' && (
              <span className={`text-[10px] rounded px-1.5 py-0.5 ${
                issue.priority === 'Blocker' ? 'bg-red-100 text-red-700' :
                issue.priority === 'Critical' ? 'bg-red-100 text-red-600' :
                issue.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'
              }`}>{issue.priority}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ id, items, config }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`rounded-xl border p-4 flex flex-col transition-colors ${
      isOver ? `${config.dropHighlight} ring-2 ring-inset` : config.header
    }`} style={{ minHeight: '400px' }}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
        <h2 className={`text-sm font-semibold ${config.textColor}`}>{id}</h2>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm border border-gray-100">
          {items.length}
        </span>
      </div>
      <div className="space-y-2 flex-1">
        {items.map(issue => (
          <KanbanCard key={issue.key} issue={issue} column={id} />
        ))}
        {items.length === 0 && (
          <div className={`h-full min-h-[300px] flex items-center justify-center text-center text-xs rounded-lg border-2 border-dashed transition-colors ${
            isOver ? 'border-teal-300 text-teal-500 bg-teal-50/50' : 'border-gray-200 text-gray-400'
          }`}>
            {isOver ? 'Drop here to move' : 'No items'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectKanbanPage() {
  const { projectId } = useParams();
  const { getProject, isLoaded } = useProjects();
  const navigate = useNavigate();
  const project = getProject(projectId);
  const sprintId = project?.jiraSprintId;
  const { issues, isLoading, mutate: mutateIssues } = useSprintIssues(sprintId);

  const [pendingMoves, setPendingMoves] = useState({});
  const [activeIssue, setActiveIssue] = useState(null);
  const [syncingKey, setSyncingKey] = useState(null);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  useEffect(() => {
    if (isLoaded && !project) navigate('/projects');
  }, [isLoaded, project, navigate]);

  // Filter out epics — only show stories/tasks/subtasks on kanban
  const storyIssues = useMemo(() =>
    (issues || []).filter(i => (i.issueType || '').toLowerCase() !== 'epic'),
    [issues]
  );

  // Merge SWR issues with pending optimistic moves
  const mergedIssues = useMemo(() => {
    if (Object.keys(pendingMoves).length === 0) return storyIssues;
    return storyIssues.map(issue => {
      if (pendingMoves[issue.key]) {
        return { ...issue, status: pendingMoves[issue.key] };
      }
      return issue;
    });
  }, [storyIssues, pendingMoves]);

  // Apply filters
  const filteredIssues = useMemo(() => {
    return (mergedIssues || []).filter(issue => {
      if (search && !issue.summary.toLowerCase().includes(search.toLowerCase()) && !issue.key.toLowerCase().includes(search.toLowerCase())) return false;
      if (assigneeFilter && (issue.assignee?.name || 'Unassigned') !== assigneeFilter) return false;
      return true;
    });
  }, [mergedIssues, search, assigneeFilter]);

  const columns = useMemo(() => {
    const cols = { 'To Do': [], 'In Progress': [], 'Done': [] };
    filteredIssues.forEach(issue => {
      cols[normalizeStatus(issue.status)].push(issue);
    });
    return cols;
  }, [filteredIssues]);

  const assignees = useMemo(() => {
    const names = new Set(storyIssues.map(i => i.assignee?.name || 'Unassigned'));
    return [...names].sort();
  }, [storyIssues]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findIssueByKey = useCallback((key) => {
    return (mergedIssues || []).find(i => i.key === key);
  }, [mergedIssues]);

  const handleDragStart = useCallback((event) => {
    setActiveIssue(findIssueByKey(event.active.id));
  }, [findIssueByKey]);

  const handleDragEnd = useCallback(async (event) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const issueKey = active.id;
    let targetColumn = over.id;
    if (!['To Do', 'In Progress', 'Done'].includes(targetColumn)) {
      const overIssue = findIssueByKey(over.id);
      if (overIssue) {
        targetColumn = normalizeStatus(overIssue.status);
      } else {
        return;
      }
    }

    const issue = findIssueByKey(issueKey);
    if (!issue) return;
    if (normalizeStatus(issue.status) === targetColumn) return;

    // Optimistic update
    setPendingMoves(prev => ({ ...prev, [issueKey]: targetColumn }));
    setSyncingKey(issueKey);

    try {
      const res = await fetch(`/api/jira/issue/${issueKey}`);
      if (!res.ok) throw new Error('Failed to fetch transitions');
      const { transitions } = await res.json();

      const target = targetColumn.toLowerCase();
      const transition = transitions.find((t) => {
        const name = t.name.toLowerCase();
        if (target === 'done') return name.includes('done') || name.includes('close') || name.includes('resolv');
        if (target === 'in progress') return name.includes('progress') || name.includes('start');
        return name.includes('todo') || name.includes('to do') || name.includes('backlog') || name.includes('open');
      });

      if (!transition) throw new Error(`No transition found for "${targetColumn}"`);

      const putRes = await fetch(`/api/jira/issue/${issueKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId: transition.id }),
      });
      if (!putRes.ok) throw new Error('Transition failed');

      // Wait for SWR to refresh, then clear pending move
      await mutateIssues();
      setPendingMoves(prev => {
        const next = { ...prev };
        delete next[issueKey];
        return next;
      });
    } catch (err) {
      console.error('Failed to transition issue:', err);
      setPendingMoves(prev => {
        const next = { ...prev };
        delete next[issueKey];
        return next;
      });
    } finally {
      setSyncingKey(null);
    }
  }, [findIssueByKey, mutateIssues]);

  if (!isLoaded || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const totalIssues = storyIssues.length;
  const doneCount = storyIssues.filter(i => normalizeStatus(i.status) === 'Done').length;

  return (
    <div className="px-6 py-8">
      <Link to={`/projects/${projectId}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Project
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Columns3 className="h-5 w-5 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">{project.name} — Kanban</h1>
          <span className="text-sm text-gray-400">{doneCount}/{totalIssues} done</span>
        </div>
        <div className="flex items-center gap-2">
          {syncingKey && (
            <span className="flex items-center gap-1.5 text-xs text-teal-600 bg-teal-50 rounded-lg px-3 py-1.5 border border-teal-200">
              <RefreshCw className="w-3 h-3 animate-spin" /> Syncing {syncingKey}...
            </span>
          )}
          <button onClick={() => mutateIssues()} className="text-xs text-gray-400 hover:text-teal-600 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:border-teal-300">
            <RefreshCw className="w-3 h-3" /> Sync from Jira
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none"
          />
        </div>
        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 outline-none"
        >
          <option value="">All Assignees</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(search || assigneeFilter) && (
          <button onClick={() => { setSearch(''); setAssigneeFilter(''); }} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
        </div>
      ) : storyIssues.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Columns3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sprint issues found.</p>
          <p className="text-xs text-gray-400 mt-1">Sync this project to Jira first, or check your Jira credentials.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={(args) => {
            // Try pointerWithin first (works for empty containers)
            const pointerCollisions = pointerWithin(args);
            if (pointerCollisions.length > 0) return pointerCollisions;
            // Fallback to rectIntersection
            return rectIntersection(args);
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(columns).map(([name, items]) => (
              <KanbanColumn key={name} id={name} items={items} config={colConfig[name]} />
            ))}
          </div>
          <DragOverlay>
            {activeIssue ? <KanbanCard issue={activeIssue} column={normalizeStatus(activeIssue.status)} isDragOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
