import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';

const REQUIRED_ENV = [
  { key: 'JIRA_DOMAIN', desc: 'Your Jira domain (e.g., yourcompany.atlassian.net)' },
  { key: 'JIRA_EMAIL', desc: 'Jira account email address' },
  { key: 'JIRA_API_TOKEN', desc: 'Jira API token from Atlassian account settings' },
  { key: 'JIRA_BOARD_ID', desc: 'Numeric ID of your Jira board' },
  { key: 'GITHUB_TOKEN', desc: '(Optional) GitHub personal access token for higher rate limits' },
];

export default function Settings() {
  const [testStatus, setTestStatus] = useState('idle'); // idle | loading | success | error
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTestStatus('loading');
    setTestResult(null);
    try {
      const res = await fetch('/api/jira/test');
      const data = await res.json();
      if (data.ok) {
        setTestStatus('success');
        setTestResult(data.user);
      } else {
        setTestStatus('error');
        setTestResult({ error: data.error || 'Connection failed' });
      }
    } catch (err) {
      setTestStatus('error');
      setTestResult({ error: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure your Jira integration and API credentials</p>
      </div>

      {/* Required Environment Variables */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Required Environment Variables</h2>
        <p className="mb-4 text-sm text-gray-500">
          Set these in <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">backend/.env</code> and restart the server.
        </p>
        <div className="space-y-3">
          {REQUIRED_ENV.map(({ key, desc }) => (
            <div key={key} className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <code className="font-mono text-sm font-semibold text-blue-700 flex-shrink-0">{key}</code>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Jira Connection Test */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Test Jira Connection</h2>
        <button
          onClick={handleTest}
          disabled={testStatus === 'loading'}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          {testStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Test Connection
        </button>

        {testStatus === 'success' && testResult && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Connected successfully!</p>
              <p className="text-xs text-green-600 mt-0.5">Logged in as {testResult.name} ({testResult.email})</p>
            </div>
          </div>
        )}

        {testStatus === 'error' && testResult && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Connection failed</p>
              <p className="text-xs text-red-600 mt-0.5">{testResult.error}</p>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Get your Jira API token from{' '}
          <a
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
          >
            Atlassian Account Settings <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
