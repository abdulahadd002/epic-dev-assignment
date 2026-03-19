import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';

export default function KanbanBoard({ kanban }) {
  const [activeIssue, setActiveIssue] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function findIssue(id) {
    for (const col of kanban.columns) {
      const issue = col.issues.find((i) => i.key === id);
      if (issue) return issue;
    }
    return null;
  }

  function handleDragStart(event) {
    setActiveIssue(findIssue(event.active.id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveIssue(null);
    if (!over) return;

    const targetColumn = kanban.columns.find(
      (col) => col.id === over.id || col.issues.some((i) => i.key === over.id)
    );
    if (!targetColumn) return;

    kanban.moveIssue(active.id, targetColumn.id);
  }

  return (
    <div className="relative">
      {kanban.moveError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{kanban.moveError.message}</span>
          <button onClick={kanban.clearMoveError} className="rounded p-0.5 hover:bg-red-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {kanban.columns.map((column) => (
            <KanbanColumn key={column.id} column={column} />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? <TaskCard issue={activeIssue} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
