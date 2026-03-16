import { useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SyncButton({ epics, assignments, deadline, projectName, onSyncComplete }) {
  const [status, setStatus] = useState('idle'); // idle | syncing | success | error
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState(null);

  const approvedEpics = (epics || []).filter((e) => e.status === 'approved');
  const canSync = approvedEpics.length >= 2;

  const handleSync = async () => {
    if (!canSync) return;
    setStatus('syncing');
    setError('');

    try {
      const res = await fetch('/api/ai/sync-jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epics, assignments, deadline, projectName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sync failed');
      }

      const data = await res.json();
      setCreatedKey(data.jiraProjectKey);
      setStatus('success');
      if (onSyncComplete) onSyncComplete(data.results, data.sprintId, data.jiraProjectKey, data.jiraBoardId);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">
          Successfully synced to Jira{createdKey ? ` (project: ${createdKey})` : ''}!
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {canSync
          ? `${approvedEpics.length} approved epic${approvedEpics.length !== 1 ? 's' : ''} will be synced. A new Jira project will be created automatically.`
          : 'At least 2 approved epics are required to sync to Jira.'}
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={!canSync || status === 'syncing'}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {status === 'syncing' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating Jira project & syncing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Sync to Jira
          </>
        )}
      </button>
    </div>
  );
}
