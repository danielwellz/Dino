import { useState } from "react";
import { useDispatch } from "react-redux";
import { useDeleteTaskMutation } from "@/state/api";
import { setSelectedTask, toggleTaskDetailsModalOpen } from "@/state/globalSlice";
import { DragSourceMonitor, useDrag } from "react-dnd";
import { Task } from "@/app/types/types";
import { Avatar, AvatarGroup } from "@mui/material";
import { Ellipsis, MessageSquare, Paperclip } from "lucide-react";




export default function TaskCard ({ task }: { task: Task }) {
  const [isTaskOptionsOpen, setIsTaskOptionsOpen] = useState(false);

  const numberOfComments = (task.comments && task.comments.length) || 0;
  const numberOfAttachments =
    (task.attachments && task.attachments.length) || 0;

  const dispatch = useDispatch();
  const [deleteTask] = useDeleteTaskMutation();

  

  const handleOpenTaskDetails = () => {
    dispatch(setSelectedTask(task));
    dispatch(toggleTaskDetailsModalOpen());
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { id: task.id },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  const priorityColorMap = {
    low: "bg-green-400 bg-opacity-20 text-green-400",
    medium: "bg-orange-400 bg-opacity-20 text-orange-400",
    high: "bg-red-500 bg-opacity-20 text-red-500",
  };

  return (
    <div
      ref={(instance) => {
        drag(instance);
      }}
      className={`flex flex-col gap-y-2 bg-white shadow rounded-md mb-4 p-4 cursor-move transition-all duration-200 ${
        isDragging ? " scale-105 shadow-lg rotate-3" : "scale-100"
      }`}
    >
      <div className="flex justify-between items-center">
        {/* priority  */}
        <div
          className={` h-5 px-1 py-0.5 rounded text-xs font-normal ${
            priorityColorMap[
              task.priority?.toLowerCase() as keyof typeof priorityColorMap
            ]
          }`}
        >
          {task.priority?.toLocaleLowerCase()}
        </div>
        <div
          className="cursor-pointer"
          onClick={() => setIsTaskOptionsOpen(!isTaskOptionsOpen)}
          onMouseLeave={() => setIsTaskOptionsOpen(false)}
        >
          <Ellipsis size={20} className="text-gray-500 hover:text-gray-900" />
          {isTaskOptionsOpen && (
            <div className="absolute top-5 right-0 bg-white shadow-md rounded-md p-2 w-2/3">
              <div
                className="text-sm font-normal text-red-500 hover:bg-red-500 hover:bg-opacity-10 rounded-md p-1 w-full"
                onClick={() =>
                  deleteTask({
                    taskId: task.id.toString(),
                    projectId: task.projectId.toString(),
                  })
                }
              >
                Delete
              </div>
              <div
                className="text-sm font-normal text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-md p-1 w-full"
                onClick={handleOpenTaskDetails}
              >
                Open
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Task attachments */}
      {/* <img src="/attachment.jpg" alt="attachment"  className="rounded-md w-full object-contain"/> */}
      {/* task title and tags*/}
      <div className="flex flex-col gap-y-1">
        {/* task title */}
        <p className="text-lg font-medium truncate line-clamp-2 text-secondary-950">
          {task.title}
        </p>
        {/* task description */}
        <p className="text-xs font-normal text-gray-700 line-clamp-3">
          {task.description}
        </p>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <AvatarGroup total={task.taskAssignments?.length} max={3} spacing={10}>
            {task.taskAssignments?.map((teamMember) => (
              <Avatar
                key={teamMember.userId}
                src={teamMember.user.profilePictureUrl ?? undefined}
                sx={{ width: 20, height: 20 }}
              />
            ))}
          </AvatarGroup>
        </div>
        <div className="flex justify-between items-center gap-x-2">
          <div className="flex justify-start items-center gap-x-1">
            <MessageSquare size={18} className="text-gray-500 " />
            <p className="text-xs font-normal text-gray-700">
              {numberOfComments}
            </p>
          </div>
          <div className="flex justify-start items-center gap-x-1">
            <Paperclip size={18} className="text-gray-500 " />
            <p className="text-xs font-normal text-gray-700">
              {numberOfAttachments}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
