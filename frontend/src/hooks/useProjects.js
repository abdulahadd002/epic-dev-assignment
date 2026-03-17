import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'focus-flow-projects';

function loadProjects() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  useEffect(() => {
    setProjects(loadProjects());
    setIsLoaded(true);
  }, []);

  const persist = useCallback((updated) => {
    setProjects(updated);
    saveProjects(updated);
  }, []);

  const addProject = useCallback(
    (project) => {
      persist([project, ...projects]);
    },
    [projects, persist]
  );

  const getProject = useCallback(
    (id) => projects.find((p) => p.id === id) || null,
    [projects]
  );

  const updateProject = useCallback(
    (id, updates) => {
      const updated = projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
      persist(updated);
    },
    [projects, persist]
  );

  const setEpics = useCallback(
    (projectId, epics) => {
      const updated = projects.map((p) =>
        p.id === projectId ? { ...p, epics, status: 'epics-ready' } : p
      );
      persist(updated);
    },
    [projects, persist]
  );

  const addStoriesToEpic = useCallback(
    (projectId, epicId, stories) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        const updatedEpics = p.epics.map((e) => (e.id === epicId ? { ...e, stories } : e));
        const allHaveStories = updatedEpics.every((e) => e.stories.length > 0);
        return { ...p, epics: updatedEpics, status: allHaveStories ? 'stories-ready' : p.status };
      });
      persist(updated);
    },
    [projects, persist]
  );

  const updateEpicStatus = useCallback(
    (projectId, epicId, status) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, epics: p.epics.map((e) => (e.id === epicId ? { ...e, status } : e)) };
      });
      persist(updated);
    },
    [projects, persist]
  );

  const updateStoryStatus = useCallback(
    (projectId, epicId, storyId, status) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          epics: p.epics.map((e) =>
            e.id === epicId
              ? { ...e, stories: e.stories.map((s) => (s.id === storyId ? { ...s, status } : s)) }
              : e
          ),
        };
      });
      persist(updated);
    },
    [projects, persist]
  );

  const updateEpic = useCallback(
    (projectId, epicId, updates) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, epics: p.epics.map((e) => (e.id === epicId ? { ...e, ...updates } : e)) };
      });
      persist(updated);
    },
    [projects, persist]
  );

  const updateStory = useCallback(
    (projectId, epicId, storyId, updates) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          epics: p.epics.map((e) =>
            e.id === epicId
              ? { ...e, stories: e.stories.map((s) => (s.id === storyId ? { ...s, ...updates } : s)) }
              : e
          ),
        };
      });
      persist(updated);
    },
    [projects, persist]
  );

  const bulkUpdateStatus = useCallback(
    (projectId, status) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          epics: p.epics.map((e) => ({
            ...e,
            status,
            stories: e.stories.map((s) => ({ ...s, status })),
          })),
        };
      });
      persist(updated);
    },
    [projects, persist]
  );

  const setAssignments = useCallback(
    (projectId, assignments, analyzedDevelopers) => {
      const updated = projects.map((p) =>
        p.id === projectId ? { ...p, assignments, analyzedDevelopers, status: 'assigned' } : p
      );
      persist(updated);
    },
    [projects, persist]
  );

  const deleteProject = useCallback(
    (projectId) => {
      const updated = projects.filter((p) => p.id !== projectId);
      persist(updated);
    },
    [projects, persist]
  );

  // Sync Jira issue stats back into localStorage so ProjectsPage cards reflect live progress
  // Uses ref to avoid depending on `projects` state (which would cause infinite re-render loops)
  const syncJiraProgress = useCallback(
    (projectId, jiraIssues) => {
      if (!jiraIssues || jiraIssues.length === 0) return;
      let todo = 0, inProgress = 0, done = 0, donePoints = 0, totalPoints = 0;
      jiraIssues.forEach(i => {
        const s = (i.status || '').toLowerCase();
        const pts = i.storyPoints || 0;
        totalPoints += pts;
        if (s.includes('done') || s.includes('closed') || s.includes('resolved')) { done++; donePoints += pts; }
        else if (s.includes('progress') || s.includes('review')) inProgress++;
        else todo++;
      });
      const updated = projectsRef.current.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          jiraProgress: {
            total: jiraIssues.length,
            todo,
            inProgress,
            done,
            donePoints,
            totalPoints,
            lastSynced: Date.now(),
          },
        };
      });
      persist(updated);
    },
    [persist]
  );

  return {
    projects,
    isLoaded,
    addProject,
    getProject,
    updateProject,
    setEpics,
    addStoriesToEpic,
    updateEpicStatus,
    updateStoryStatus,
    updateEpic,
    updateStory,
    bulkUpdateStatus,
    setAssignments,
    deleteProject,
    syncJiraProgress,
  };
}
