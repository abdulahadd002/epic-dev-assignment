import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

const headerColors = {
  gray: 'border-gray-400 text-gray-700 bg-gray-50',
  blue: 'border-blue-400 text-blue-700 bg-blue-50',
  green: 'border-green-400 text-green-700 bg-green-50',
};

export default function KanbanColumn({ column }) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const totalSP = column.issues.reduce((s, i) => s + (i.storyPoints || 0), 0);
  const colorClass = headerColors[column.color] || headerColors.gray;

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-gray-50 overflow-hidden min-h-96">
      {/* Column Header */}
      <div className={`flex items-center justify-between border-l-4 px-4 py-3 ${colorClass}`}>
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-white px-2 py-0.5 font-medium shadow-sm">
            {column.issues.length}
          </span>
          {totalSP > 0 && <span className="opacity-70">{totalSP} SP</span>}
        </div>
      </div>

      {/* Drop Zone */}
      <div ref={setNodeRef} className="flex-1 p-3 space-y-2 min-h-24">
        <SortableContext items={column.issues.map((i) => i.key)} strategy={verticalListSortingStrategy}>
          {column.issues.map((issue) => (
            <TaskCard key={issue.key} issue={issue} />
          ))}
        </SortableContext>

        {column.issues.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-xs text-gray-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
