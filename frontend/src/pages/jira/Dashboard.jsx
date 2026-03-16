import { useJira } from '../../context/JiraContext';
import { useSprintIssues, useBurndownData } from '../../hooks/useSprintData';
import { useAlerts } from '../../hooks/useAlerts';
import { calculateHealthScore } from '../../utils/healthScore';
import SprintSummary from '../../components/dashboard/SprintSummary';
import BurndownChart from '../../components/dashboard/BurndownChart';
import HealthScore from '../../components/dashboard/HealthScore';
import AlertsPanel from '../../components/dashboard/AlertsPanel';
import SprintSelector from '../../components/reports/SprintSelector';

export default function Dashboard() {
  const { sprints, activeSprint, selectedSprintId, setSelectedSprintId } = useJira();
  const { issues } = useSprintIssues(selectedSprintId);
  const { burndown } = useBurndownData(selectedSprintId);
  const { alerts, dismissAlert, dismissAll } = useAlerts(issues);

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId) || activeSprint;
  const totalPoints = issues.reduce((s, i) => s + (i.storyPoints || 0), 0);
  const healthScore = calculateHealthScore(burndown, issues, totalPoints);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Sprint overview and health monitoring</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sprint Selector */}
        <div className="lg:col-span-1">
          <SprintSelector
            sprints={sprints}
            selectedId={selectedSprintId}
            onSelect={setSelectedSprintId}
          />
        </div>

        {/* Main content */}
        <div className="space-y-6 lg:col-span-3">
          <SprintSummary sprint={selectedSprint} issues={issues} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BurndownChart burndown={burndown} />
            <HealthScore healthScore={healthScore} />
          </div>
          <AlertsPanel alerts={alerts} onDismiss={dismissAlert} onDismissAll={dismissAll} />
        </div>
      </div>
    </div>
  );
}
