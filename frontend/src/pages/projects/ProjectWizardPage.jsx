import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkflowProvider, useWorkflow } from '../../context/WorkflowContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useProjects } from '../../hooks/useProjects';
import { useDevelopers } from '../../hooks/useDevelopers';
import { Clock, Calendar, Upload, Loader2, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';

import ProgressStepper from '../../components/shared/ProgressStepper';
import Step1_EpicGeneration from '../../components/steps/Step1_EpicGeneration';
import Step2_EpicApproval from '../../components/steps/Step2_EpicApproval';
import Step3_DeveloperAnalysis from '../../components/steps/Step3_DeveloperAnalysis';
import Step4_Assignment from '../../components/steps/Step4_Assignment';

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)', transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

// Transform snake_case wizard data → camelCase for useProjects
function transformEpicsForProject(generatedEpics) {
  return generatedEpics
    .filter((e) => e.approved)
    .map((epic) => ({
      id: epic.epic_id,
      title: epic.epic_title,
      description: epic.epic_description || '',
      status: 'approved',
      stories: (epic.user_stories || [])
        .filter((s) => s.approved)
        .map((s) => ({
          id: s.story_id,
          title: s.story_title,
          description: s.story_description || '',
          acceptanceCriteria: s.acceptance_criteria || '',
          storyPoints: parseInt(s.story_points) || 5,
          status: 'approved',
        })),
    }));
}

function transformAssignmentsForProject(assignments) {
  return (assignments || []).map((a) => ({
    epic_id: a.epic?.epic_id,
    epic_title: a.epic?.epic_title,
    assigned_developer: a.developer?.username,
    score: a.score,
    confidence: a.confidence,
  }));
}

function WizardContent() {
  const { currentStep, generatedEpics, developers, assignments, projectDescription, reset } = useWorkflow();
  const { addProject } = useProjects();
  const { addDevelopers, developers: rosterDevs } = useDevelopers();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [deadlineValue, setDeadlineValue] = useState('');
  const [deadlineUnit, setDeadlineUnit] = useState('weeks');
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncProgress, setSyncProgress] = useState('');
  const [syncError, setSyncError] = useState('');
  const [saving, setSaving] = useState(false);

  const steps = {
    1: <Step1_EpicGeneration />,
    2: <Step2_EpicApproval />,
    3: <Step3_DeveloperAnalysis />,
    4: <Step4_Assignment />,
  };

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

  const handleSaveAndSync = async () => {
    const name = projectName.trim() || 'Untitled Project';
    const epics = transformEpicsForProject(generatedEpics);
    const flatAssignments = transformAssignmentsForProject(assignments);

    if (epics.length < 2) {
      setSyncError('At least 2 approved epics are required to sync.');
      return;
    }

    setSyncStatus('syncing');
    setSyncError('');
    setSyncProgress('Creating Jira project...');

    const progressSteps = [
      { delay: 3000, msg: 'Setting up project board...' },
      { delay: 6000, msg: 'Creating sprint...' },
      { delay: 10000, msg: 'Creating epics & stories...' },
      { delay: 18000, msg: 'Assigning developers...' },
      { delay: 25000, msg: 'Moving issues to sprint...' },
      { delay: 35000, msg: 'Finalizing sync...' },
    ];
    const timers = progressSteps.map(({ delay, msg }) =>
      setTimeout(() => setSyncProgress(msg), delay)
    );

    try {
      const res = await fetch('/api/ai/sync-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epics: epics.map((e) => ({ ...e, status: 'approved' })),
          assignments: flatAssignments,
          deadline: deadlineValue ? { value: deadlineValue, unit: deadlineUnit } : null,
          projectName: name,
          developerJiraMap: developers.reduce((map, d) => {
            const jira = d.jiraUsername || rosterDevs.find((r) => r.username === d.username)?.jiraUsername;
            if (jira) map[d.username] = jira;
            return map;
          }, {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await res.json();

      const updatedEpics = epics.map((epic) => {
        const result = (data.results || []).find((r) => r.epicId === epic.id);
        if (!result) return epic;
        return {
          ...epic,
          jiraKey: result.epicKey,
          stories: epic.stories.map((s) => {
            const sr = (result.stories || []).find((rs) => rs.storyId === s.id);
            return sr ? { ...s, jiraKey: sr.storyKey } : s;
          }),
        };
      });

      if (developers.length > 0) addDevelopers(developers);

      const projectId = Date.now().toString();
      addProject({
        id: projectId,
        name,
        rawText: projectDescription,
        createdAt: new Date().toISOString(),
        status: 'synced',
        epics: updatedEpics,
        assignments: flatAssignments,
        analyzedDevelopers: developers,
        deadline: deadlineValue ? { value: deadlineValue, unit: deadlineUnit } : null,
        jiraSprintId: data.sprintId,
        jiraProjectKey: data.jiraProjectKey,
        jiraBoardId: data.jiraBoardId,
      });

      setSyncStatus('success');
      reset();
      setTimeout(() => navigate(`/projects/${projectId}`), 1500);
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err.message);
    } finally {
      timers.forEach(clearTimeout);
      setSyncProgress('');
    }
  };

  const handleSaveOnly = () => {
    setSaving(true);
    const name = projectName.trim() || 'Untitled Project';
    const epics = transformEpicsForProject(generatedEpics);
    const flatAssignments = transformAssignmentsForProject(assignments);

    if (developers.length > 0) addDevelopers(developers);

    const projectId = Date.now().toString();
    addProject({
      id: projectId,
      name,
      rawText: projectDescription,
      createdAt: new Date().toISOString(),
      status: assignments.length > 0 ? 'assigned' : 'stories-ready',
      epics,
      assignments: flatAssignments,
      analyzedDevelopers: developers,
    });

    reset();
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="relative min-h-screen px-6 py-8">
      <div className="relative z-10 max-w-7xl mx-auto">
          <ProgressStepper />

          {/* Project Name — visible on Step 1 */}
          {currentStep === 1 && (
            <div className="mt-8 max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
            </div>
          )}

          <div className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div key={currentStep} variants={pageVariants} initial="initial" animate="animate" exit="exit">
                {steps[currentStep]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step 5: Save & Sync */}
          {currentStep === 4 && assignments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 max-w-3xl mx-auto space-y-6"
            >
              {/* Sprint Deadline */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-teal-500" />
                  Sprint Deadline
                </h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={deadlineValue}
                    onChange={(e) => setDeadlineValue(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-24 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  <select
                    value={deadlineUnit}
                    onChange={(e) => setDeadlineUnit(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 text-gray-900 px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                  {deadlineEndDate && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      Ends: <span className="font-medium text-gray-900">{deadlineEndDate}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Sync to Jira */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Save & Sync to Jira</h3>

                {syncStatus === 'success' ? (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Successfully synced! Redirecting...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">
                      A new Jira project will be created automatically with all approved epics, stories, and assignments.
                    </p>

                    {syncError && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          {syncError}
                        </div>
                        <div>
                          <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                            <Pencil className="h-3 w-3" />
                            Rename Project & Retry
                          </label>
                          <input
                            type="text"
                            value={projectName}
                            onChange={(e) => { setProjectName(e.target.value); setSyncError(''); setSyncStatus('idle'); }}
                            placeholder="Enter a new project name..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-2.5 text-sm
                                       focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveAndSync}
                        disabled={syncStatus === 'syncing'}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold
                                   bg-teal-500 text-white rounded-xl
                                   hover:bg-teal-600 active:scale-[0.98] transition-all
                                   disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {syncStatus === 'syncing' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {syncProgress || 'Creating Jira project & syncing...'}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Save & Sync to Jira
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleSaveOnly}
                        disabled={syncStatus === 'syncing' || saving}
                        className="px-4 py-2.5 text-sm font-medium text-gray-600 rounded-xl
                                   border border-gray-200 hover:bg-gray-50 hover:text-gray-900
                                   active:scale-[0.98] transition-all"
                      >
                        {saving ? 'Saving...' : 'Save Without Jira'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
      </div>
    </div>
  );
}

export default function ProjectWizardPage() {
  return (
    <WorkflowProvider>
      <WizardContent />
    </WorkflowProvider>
  );
}
