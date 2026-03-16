import { useState, useMemo, useCallback } from 'react';

const COLUMNS = [
  { id: 'To Do', title: 'To Do', color: 'gray' },
  { id: 'In Progress', title: 'In Progress', color: 'blue' },
  { id: 'Done', title: 'Done', color: 'green' },
];

function normalizeStatus(status) {
  const s = (status || '').toLowerCase();
  if (s === 'done' || s === 'closed' || s === 'resolved') return 'Done';
  if (s.includes('progress') || s === 'in review' || s === 'review') return 'In Progress';
  return 'To Do';
}

export function useKanbanBoard(issues) {
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = useMemo(() => {
    return (issues || []).filter((issue) => {
      if (search && !issue.summary.toLowerCase().includes(search.toLowerCase()) && !issue.key.toLowerCase().includes(search.toLowerCase())) return false;
      if (assigneeFilter && (issue.assignee?.name || 'Unassigned') !== assigneeFilter) return false;
      if (priorityFilter && issue.priority !== priorityFilter) return false;
      if (typeFilter && issue.issueType !== typeFilter) return false;
      return true;
    });
  }, [issues, search, assigneeFilter, priorityFilter, typeFilter]);

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      issues: filtered.filter((i) => normalizeStatus(i.status) === col.id),
    }));
  }, [filtered]);

  const moveIssue = useCallback(async (issueKey, targetStatus) => {
    try {
      const res = await fetch(`/api/jira/issue/${issueKey}`);
      if (!res.ok) return;
      const { transitions } = await res.json();

      const target = targetStatus.toLowerCase();
      const transition = transitions.find((t) => {
        const name = t.name.toLowerCase();
        const to = (t.to || '').toLowerCase();
        if (target === 'done') return name.includes('done') || name.includes('close') || name.includes('resolv');
        if (target === 'in progress') return name.includes('progress') || name.includes('start');
        return name.includes('todo') || name.includes('to do') || name.includes('backlog') || name.includes('open');
      });

      if (!transition) return;

      await fetch(`/api/jira/issue/${issueKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId: transition.id }),
      });
    } catch (err) {
      console.error('Failed to move issue:', err);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setAssigneeFilter('');
    setPriorityFilter('');
    setTypeFilter('');
  }, []);

  const assignees = useMemo(() => {
    const names = new Set((issues || []).map((i) => i.assignee?.name || 'Unassigned'));
    return [...names].sort();
  }, [issues]);

  const priorities = useMemo(() => {
    const names = new Set((issues || []).map((i) => i.priority).filter(Boolean));
    return [...names].sort();
  }, [issues]);

  const types = useMemo(() => {
    const names = new Set((issues || []).map((i) => i.issueType).filter(Boolean));
    return [...names].sort();
  }, [issues]);

  return {
    columns,
    search, setSearch,
    assigneeFilter, setAssigneeFilter,
    priorityFilter, setPriorityFilter,
    typeFilter, setTypeFilter,
    clearFilters,
    moveIssue,
    assignees, priorities, types,
  };
}
