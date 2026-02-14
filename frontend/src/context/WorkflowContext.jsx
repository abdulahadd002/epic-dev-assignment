import { createContext, useContext, useState, useEffect } from 'react';

const WorkflowContext = createContext(null);

export function WorkflowProvider({ children }) {
  // Load state from localStorage
  const loadState = () => {
    try {
      const saved = localStorage.getItem('epic-workflow-state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
    return null;
  };

  const initialState = loadState() || {
    currentStep: 1,
    projectDescription: '',
    generatedEpics: [],
    approvedEpics: [],
    developers: [],
    assignments: [],
    workloadDistribution: {},
    generatorUsed: ''
  };

  const [state, setState] = useState(initialState);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('epic-workflow-state', JSON.stringify(state));
  }, [state]);

  const actions = {
    // Navigation
    setCurrentStep: (step) => {
      setState(prev => ({ ...prev, currentStep: step }));
    },

    nextStep: () => {
      setState(prev => ({
        ...prev,
        currentStep: Math.min(4, prev.currentStep + 1)
      }));
    },

    previousStep: () => {
      setState(prev => ({
        ...prev,
        currentStep: Math.max(1, prev.currentStep - 1)
      }));
    },

    // Step 1: Epic Generation
    setProjectDescription: (description) => {
      setState(prev => ({ ...prev, projectDescription: description }));
    },

    setGeneratedEpics: (epics, generatorUsed) => {
      setState(prev => ({
        ...prev,
        generatedEpics: epics,
        generatorUsed: generatorUsed || prev.generatorUsed
      }));
    },

    // Step 2: Epic Approval
    approveEpic: (epicIndex) => {
      setState(prev => {
        const epics = [...prev.generatedEpics];
        const epic = epics[epicIndex];
        epic.approved = true;
        epic.user_stories?.forEach(story => {
          story.approved = true;
          story.ac_approved = true;
          story.test_cases?.forEach(tc => tc.approved = true);
        });
        return { ...prev, generatedEpics: epics };
      });
    },

    approveStory: (epicIndex, storyIndex) => {
      setState(prev => {
        const epics = [...prev.generatedEpics];
        const story = epics[epicIndex].user_stories[storyIndex];
        story.approved = true;
        story.ac_approved = true;
        story.test_cases?.forEach(tc => tc.approved = true);
        return { ...prev, generatedEpics: epics };
      });
    },

    approveAC: (epicIndex, storyIndex) => {
      setState(prev => {
        const epics = [...prev.generatedEpics];
        epics[epicIndex].user_stories[storyIndex].ac_approved = true;
        return { ...prev, generatedEpics: epics };
      });
    },

    approveTestCase: (epicIndex, storyIndex, tcIndex) => {
      setState(prev => {
        const epics = [...prev.generatedEpics];
        epics[epicIndex].user_stories[storyIndex].test_cases[tcIndex].approved = true;
        return { ...prev, generatedEpics: epics };
      });
    },

    cancelEpic: (epicIndex) => {
      setState(prev => {
        const epics = prev.generatedEpics.filter((_, i) => i !== epicIndex);
        return { ...prev, generatedEpics: epics };
      });
    },

    setApprovedEpics: (epics) => {
      setState(prev => ({ ...prev, approvedEpics: epics }));
    },

    // Step 3: Developer Analysis
    setDevelopers: (developers) => {
      setState(prev => ({ ...prev, developers }));
    },

    addDeveloper: (developer) => {
      setState(prev => ({
        ...prev,
        developers: [...prev.developers, developer]
      }));
    },

    removeDeveloper: (index) => {
      setState(prev => ({
        ...prev,
        developers: prev.developers.filter((_, i) => i !== index)
      }));
    },

    // Step 4: Assignment
    setAssignments: (assignments, workloadDistribution) => {
      setState(prev => ({
        ...prev,
        assignments,
        workloadDistribution: workloadDistribution || prev.workloadDistribution
      }));
    },

    reassignEpic: (epicId, newDeveloperUsername) => {
      setState(prev => {
        const assignments = [...prev.assignments];
        const workload = { ...prev.workloadDistribution };

        const assignmentIndex = assignments.findIndex(a => a.epic.epic_id === epicId);
        if (assignmentIndex !== -1) {
          const assignment = assignments[assignmentIndex];
          const oldDev = assignment.developer.username;
          const storyPoints = assignment.epic.totalStoryPoints;

          // Update workload
          workload[oldDev] -= storyPoints;
          workload[newDeveloperUsername] = (workload[newDeveloperUsername] || 0) + storyPoints;

          // Update assignment
          const newDev = prev.developers.find(d => d.username === newDeveloperUsername);
          if (newDev) {
            assignment.developer = {
              username: newDev.username,
              expertise: newDev.analysis.expertise.primary,
              experienceLevel: newDev.analysis.experienceLevel.level,
              avatar: newDev.avatar
            };
            assignment.confidence = "manual";
          }
        }

        return {
          ...prev,
          assignments,
          workloadDistribution: workload
        };
      });
    },

    // Reset
    reset: () => {
      localStorage.removeItem('epic-workflow-state');
      setState({
        currentStep: 1,
        projectDescription: '',
        generatedEpics: [],
        approvedEpics: [],
        developers: [],
        assignments: [],
        workloadDistribution: {},
        generatorUsed: ''
      });
    }
  };

  return (
    <WorkflowContext.Provider value={{ ...state, ...actions }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
}
