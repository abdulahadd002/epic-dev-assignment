import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { formatDate } from '../../utils/utils';

export default function BurndownChart({ burndown }) {
  const [showBurnup, setShowBurnup] = useState(false);

  if (!burndown || burndown.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Burndown Chart</h3>
        <p className="py-8 text-center text-sm text-gray-400">No burndown data available.</p>
      </div>
    );
  }

  const data = burndown.map((p) => ({
    date: formatDate(p.date),
    Ideal: p.ideal,
    Actual: p.actual,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Burndown Chart</h3>
        <button
          onClick={() => setShowBurnup(!showBurnup)}
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
        >
          {showBurnup ? 'Show Burndown' : 'Show Burnup'}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Ideal" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="Actual" stroke="#3b82f6" dot={{ r: 3 }} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
