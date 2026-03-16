import { CheckCircle2, XCircle, Clock, Pencil } from 'lucide-react';

function StatusIcon({ status }) {
  if (status === 'approved') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'rejected') return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-yellow-500" />;
}

export default function StoryCard({ story, epicId, onApprove, onReject, onEdit }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 pl-12">
      <div className="flex items-center gap-3 min-w-0">
        <StatusIcon status={story.status} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium uppercase text-blue-600">Story</span>
            <span className="text-sm font-medium text-gray-900 truncate">{story.title}</span>
            {story.jiraKey && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {story.jiraKey}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{story.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {onEdit && (
          <button
            onClick={() => onEdit(epicId, story)}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {story.status !== 'approved' && onApprove && (
          <button
            onClick={() => onApprove(epicId, story.id)}
            className="rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
          >
            Approve
          </button>
        )}
        {story.status !== 'rejected' && onReject && (
          <button
            onClick={() => onReject(epicId, story.id)}
            className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
