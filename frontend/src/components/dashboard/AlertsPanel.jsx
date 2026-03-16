import { AlertTriangle, Bug, GitBranch, X } from 'lucide-react';

const icons = {
  blocker: { Icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200' },
  bug: { Icon: Bug, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  scope: { Icon: GitBranch, color: 'text-blue-600 bg-blue-50 border-blue-200' },
};

export default function AlertsPanel({ alerts, onDismiss, onDismissAll }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Alerts</h3>
        <p className="text-sm text-gray-400">No active alerts. Sprint looks good!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Alerts ({alerts.length})</h3>
        {onDismissAll && (
          <button onClick={onDismissAll} className="text-xs text-gray-400 hover:text-gray-600">
            Dismiss all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const cfg = icons[alert.type] || icons.blocker;
          return (
            <div key={alert.id} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${cfg.color}`}>
              <cfg.Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="mt-0.5 text-xs opacity-80 line-clamp-2">{alert.message}</p>
              </div>
              {onDismiss && (
                <button onClick={() => onDismiss(alert.id)} className="flex-shrink-0 opacity-60 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
