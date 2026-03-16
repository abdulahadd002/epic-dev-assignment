import { CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react';
import { daysRemaining } from '../../utils/utils';

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colorMap[color] || colorMap.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function SprintSummary({ sprint, issues }) {
  const total = issues.reduce((s, i) => s + (i.storyPoints || 0), 0);
  const completed = issues
    .filter((i) => i.statusCategory === 'Done' || i.status === 'Done')
    .reduce((s, i) => s + (i.storyPoints || 0), 0);
  const days = sprint ? daysRemaining(sprint.endDate) : 0;
  const blockers = issues.filter((i) => i.priority === 'Blocker' || i.priority === 'Critical').length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard icon={Zap} label="Total Points" value={total} sub="in sprint" color="blue" />
      <StatCard icon={CheckCircle2} label="Completed" value={completed} sub={`of ${total} points`} color="green" />
      <StatCard icon={Clock} label="Days Left" value={days} sub={sprint?.name || 'sprint'} color="yellow" />
      <StatCard icon={AlertTriangle} label="Blockers" value={blockers} sub="critical issues" color="red" />
    </div>
  );
}
