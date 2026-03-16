import { useState } from 'react';
import { useJira } from '../../context/JiraContext';
import { useSprintIssues, useSprintDetails, useBurndownData } from '../../hooks/useSprintData';
import { calculateHealthScore } from '../../utils/healthScore';
import SprintSelector from '../../components/reports/SprintSelector';
import ReportGenerator from '../../components/reports/ReportGenerator';
import ExportButtons from '../../components/reports/ExportButtons';

function buildReport(sprint, issues, burndown) {
  if (!sprint || !issues) return null;

  const completedIssues = issues.filter((i) => i.statusCategory === 'Done' || i.status === 'Done').length;
  const totalPoints = issues.reduce((s, i) => s + (i.storyPoints || 0), 0);
  const completedPoints = issues
    .filter((i) => i.statusCategory === 'Done' || i.status === 'Done')
    .reduce((s, i) => s + (i.storyPoints || 0), 0);

  const issuesByType = {};
  const issuesByPriority = {};
  const issuesByAssignee = {};

  for (const issue of issues) {
    issuesByType[issue.issueType] = (issuesByType[issue.issueType] || 0) + 1;
    issuesByPriority[issue.priority] = (issuesByPriority[issue.priority] || 0) + 1;
    const name = issue.assignee?.name || 'Unassigned';
    issuesByAssignee[name] = (issuesByAssignee[name] || 0) + 1;
  }

  const healthScore = calculateHealthScore(burndown, issues, totalPoints);

  return {
    sprint,
    issues,
    totalIssues: issues.length,
    completedIssues,
    totalPoints,
    completedPoints,
    issuesByType,
    issuesByPriority,
    issuesByAssignee,
    healthScore,
  };
}

export default function Reports() {
  const { sprints } = useJira();
  const [selectedId, setSelectedId] = useState(null);

  const { sprint } = useSprintDetails(selectedId);
  const { issues } = useSprintIssues(selectedId);
  const { burndown } = useBurndownData(selectedId);

  const report = buildReport(sprint, issues, burndown);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprint Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Generate and export sprint performance reports</p>
        </div>
        {report && <ExportButtons report={report} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <SprintSelector sprints={sprints} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="lg:col-span-3">
          {!selectedId ? (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-20">
              <p className="text-sm text-gray-400">Select a sprint to generate a report</p>
            </div>
          ) : !report ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <ReportGenerator report={report} />
          )}
        </div>
      </div>
    </div>
  );
}
