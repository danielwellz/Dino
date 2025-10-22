import React from 'react';
import { useGetProjectTasksQuery, useUpdateTaskStatusMutation } from '@/state/api';
import { Task } from '@/app/types/types';

interface TaskBoardProps {
  projectId: string;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ projectId }) => {
  const {
    data: tasks,
    isLoading,
    isError,
    error
  } = useGetProjectTasksQuery({ projectId });

  const [updateTaskStatus] = useUpdateTaskStatusMutation();

  const handleDragEnd = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus({ taskId, status: newStatus, projectId });
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const tasksByStatus = tasks?.reduce((acc, task) => {
    const status = task.status || 'TODO';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(task);
    return acc;
  }, {} as Record<string, Task[]>) || {};

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  if (isError) {
    return <div className="text-red-500 p-4">
      Error loading tasks: {(error as any)?.data?.message || 'Something went wrong'}
    </div>;
  }

  const columns = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {columns.map(status => (
        <div
          key={status}
          className="bg-gray-100 rounded-lg p-4"
        >
          <h3 className="font-semibold mb-4">{status}</h3>
          <div className="space-y-2">
            {(tasksByStatus[status] || []).map(task => (
              <div
                key={task.id}
                draggable
                onDragEnd={(e) => {
                  const column = e.currentTarget.closest('[data-status]');
                  if (column) {
                    const newStatus = column.getAttribute('data-status');
                    if (newStatus && newStatus !== task.status) {
                      handleDragEnd(task.id.toString(), newStatus);
                    }
                  }
                }}
                className="bg-white p-3 rounded shadow-sm cursor-move hover:shadow-md transition-shadow"
              >
                <h4 className="font-medium">{task.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                {task.dueDate && (
                  <div className="text-xs text-gray-500 mt-2">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskBoard;