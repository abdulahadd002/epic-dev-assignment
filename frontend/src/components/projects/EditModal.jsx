import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function EditModal({ type, title, description, acceptanceCriteria, onSave, onClose }) {
  const [formTitle, setFormTitle] = useState(title || '');
  const [formDescription, setFormDescription] = useState(description || '');
  const [formAC, setFormAC] = useState(acceptanceCriteria || '');

  useEffect(() => {
    setFormTitle(title || '');
    setFormDescription(description || '');
    setFormAC(acceptanceCriteria || '');
  }, [title, description, acceptanceCriteria]);

  const handleSave = () => {
    if (!formTitle.trim()) return;
    onSave({ title: formTitle.trim(), description: formDescription.trim(), acceptanceCriteria: formAC.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Edit {type === 'epic' ? 'Epic' : 'Story'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {type === 'story' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Acceptance Criteria</label>
              <textarea
                value={formAC}
                onChange={(e) => setFormAC(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formTitle.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
