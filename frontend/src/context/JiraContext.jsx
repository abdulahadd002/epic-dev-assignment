import { createContext, useContext, useState, useEffect } from 'react';
import { useSprints } from '../hooks/useSprintData';

const JiraContext = createContext(null);

export function JiraProvider({ children }) {
  const { sprints, isLoading, error } = useSprints();
  const [selectedSprintId, setSelectedSprintId] = useState(null);

  const sprintList = Array.isArray(sprints) ? sprints : [];

  useEffect(() => {
    if (sprintList.length > 0 && selectedSprintId === null) {
      const active = sprintList.find((s) => s.state === 'active');
      setSelectedSprintId(active ? active.id : sprintList[0].id);
    }
  }, [sprintList, selectedSprintId]);

  const activeSprint = sprintList.find((s) => s.state === 'active') || null;

  return (
    <JiraContext.Provider value={{ sprints: sprintList, activeSprint, selectedSprintId, setSelectedSprintId, isLoading, error }}>
      {children}
    </JiraContext.Provider>
  );
}

export function useJira() {
  const ctx = useContext(JiraContext);
  if (!ctx) throw new Error('useJira must be used within JiraProvider');
  return ctx;
}
