import { Priority, Task } from "@/app/types/types";
import { Avatar, AvatarGroup } from "@mui/material";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import React, { useMemo } from "react";
import { PriorityComponent } from "../PriorityComponent";
import { useDispatch } from "react-redux";
import {
  setSelectedTask,
  toggleTaskDetailsModalOpen,
} from "@/state/globalSlice";
import Image from "next/image";
import { useGetTaskAssigneesQuery } from "@/state/api";
import { useLocale } from "next-intl";
import { getLocalizedAvatarPlaceholder } from "@/lib/avatar";

type Props = {
  task: Task;
};

export const TaskCard = ({ task }: Props) => {
  const locale = useLocale();
  const placeholderAvatar = getLocalizedAvatarPlaceholder(locale);
  const isRTL = locale === "fa";
  const endDate = useMemo(
    () => (task?.dueDate ? new Date(task.dueDate) : new Date()),
    [task?.dueDate]
  );
  const dispatch = useDispatch();
  const { data: taskAssignees } = useGetTaskAssigneesQuery({
    taskId: String(task.id),
  });
  const handleTaskCardClick = () => {
    dispatch(setSelectedTask(task));
    dispatch(toggleTaskDetailsModalOpen());
  };

  const tagsText = useMemo(() => {
    if (!task.tags) return "";
    const separator = locale === "fa" ? "، " : ", ";
    return task.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(separator);
  }, [task.tags, locale]);

  const projectBadge = task.project?.name;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`bg-white rounded-lg p-4 shadow-sm flex flex-col justify-start items-start gap-y-4 w-72 h-80 mb-4 ${isRTL ? "mr-2" : "ml-2"} cursor-pointer hover:shadow-xl transition-shadow duration-300 ease-in-out`}
      onClick={handleTaskCardClick}
    >
      <Image
        width={250}
        height={200}
        src="/projectCover.png"
        alt="project"
        className="w-full h-32 rounded-lg object-cover"
      />
      <h2 className={`text-lg font-bold text-secondary-950 ${isRTL ? "text-right" : "text-start"}`}>
        {task?.title}
      </h2>
      {projectBadge && (
        <div
          className={`w-full text-xs font-semibold uppercase tracking-wide text-primary-600 ${isRTL ? "text-right" : "text-left"}`}
        >
          {projectBadge}
        </div>
      )}
      <div className={`flex items-center w-full justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <p className={`text-sm text-gray-500 truncate max-w-[160px] ${isRTL ? "text-right" : "text-left"}`}>
          {tagsText}
        </p>

        <PriorityComponent priority={task?.priority as Priority} />
      </div>
      <div className="h-12 w-full">
        <p className={`text-sm text-gray-500 overflow-hidden line-clamp-2 ${isRTL ? "text-right" : ""}`}>
          {task?.description}
        </p>
      </div>

      <div className="flex justify-between gap-7 items-center w-full mt-auto">
        <AvatarGroup
          total={taskAssignees?.length}
          max={3}
          spacing={10}
          sx={{
            direction: isRTL ? "rtl" : "ltr",
            "& .MuiAvatar-root": {
              width: 24,
              height: 24,
              marginLeft: isRTL ? 0 : "-8px",
              marginRight: isRTL ? "-8px" : 0,
            },
          }}
        >
          {taskAssignees?.map((teamMember) => (
            <Avatar
              key={teamMember.userId}
              src={teamMember.user.profilePictureUrl ?? placeholderAvatar}
              sx={{ width: 24, height: 24 }}
            />
          ))}
        </AvatarGroup>

        <div
          className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse ml-2" : "justify-start mr-4"}`}
        >
          <Clock className="w-4 h-4 text-gray-500" />
          <p className="text-sm text-gray-500">
            {format(endDate, "MM/dd/yyyy")}
          </p>
        </div>
      </div>
    </div>
  );
};
