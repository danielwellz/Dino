"use client";

import CircularProgress from "@mui/material/CircularProgress";
import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useGetProjectsQuery, useGetUserTasksQuery } from "@/state/api";
import { Task, Project } from "../types/types";
import { ActivityChart } from "./ActivityChart/chart-line-default";
import { Calendar } from "@/components/ui/calendar";
import ProjectCard from "@/components/ProjectCard";
import { TaskCard } from "@/components/TaskCard";
import { useTranslations, useLocale } from "next-intl";
import { faIR } from "date-fns/locale";

function HomePage() {
  const { data: projects, isLoading: isLoadingProjects, isError: isErrorProjects } =
    useGetProjectsQuery();
  const { data: tasks, isLoading: isLoadingTasks, isError: isErrorTasks } =
    useGetUserTasksQuery();

  const tDashboard = useTranslations("dashboard");

  const projectList = useMemo(() => projects ?? [], [projects]);
  const taskList = useMemo(() => tasks ?? [], [tasks]);
  const activeTaskList = useMemo(
    () =>
      taskList.filter((task) => {
        const status = (task.status ?? "").toLowerCase();
        return status !== "completed" && status !== "done";
      }),
    [taskList]
  );

  return (
    <div className="flex flex-col justify-start gap-y-6 p-10 sm:p-6 bg-[#f5f5f5] min-h-screen">
      <ProjectHeader userTasks={taskList} activeTasks={activeTaskList} />

      <section aria-labelledby="dashboard-active-projects">
        <div className="flex justify-between items-center">
          <h2 id="dashboard-active-projects" className="text-secondary-950 text-xl font-bold">
            {tDashboard("activeProjects")}
          </h2>
          <div className="flex justify-start gap-x-3 items-center" aria-hidden>
            <div className="cursor-pointer hover:bg-gray-200 rounded-full p-1">
              <ArrowLeft size={20} className="text-secondary-950" />
            </div>
            <div className="cursor-pointer hover:bg-gray-200 rounded-full p-1">
              <ArrowRight size={20} className="text-secondary-950" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-x-4 justify-start items-start max-w-fit overflow-x-auto gap-y-5 h-full overflow-y-visible scroll-smooth">
          {isLoadingProjects && (
            <div className="flex justify-center items-center w-full h-full">
              <CircularProgress />
            </div>
          )}
          {isErrorProjects && (
            <div className="text-center font-normal text-lg text-secondary-950">
              {tDashboard("errorLoadingProjects")}
            </div>
          )}
          {!isLoadingProjects && projectList.length === 0 ? (
            <div className="text-center font-normal text-lg text-secondary-950">
              {tDashboard("noProjects")}
            </div>
          ) : (
            projectList.map((project: Project) => <ProjectCard key={project.id} project={project} />)
          )}
        </div>
      </section>

      <section aria-labelledby="dashboard-active-tasks">
        <div className="flex justify-between items-center">
          <h2 id="dashboard-active-tasks" className="text-secondary-950 text-xl font-bold">
            {tDashboard("activeTasks")}
          </h2>
          <div className="flex justify-start gap-x-3 items-center" aria-hidden>
            <div className="cursor-pointer hover:bg-gray-200 rounded-full p-1">
              <ArrowLeft size={20} className="text-secondary-950" />
            </div>
            <div className="cursor-pointer hover:bg-gray-200 rounded-full p-1">
              <ArrowRight size={20} className="text-secondary-950" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-x-4 justify-start items-start w-full max-w-fit overflow-x-auto gap-y-5 h-full overflow-y-visible scroll-smooth">
          {isLoadingTasks ? (
            <div className="flex justify-center items-center w-full h-full">
              <CircularProgress />
            </div>
          ) : isErrorTasks ? (
            <div className="text-center font-normal text-lg text-secondary-950">
              {tDashboard("errorLoadingTasks")}
            </div>
          ) : null}
          {!isLoadingTasks && !isErrorTasks && activeTaskList.length === 0 && (
            <div className="text-center font-normal text-lg text-secondary-950">
              {tDashboard("noTasks")}
            </div>
          )}
          {activeTaskList.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;

type ProjectHeaderProps = {
  userTasks: Task[];
  activeTasks: Task[];
};

const ProjectHeader = ({ userTasks, activeTasks }: ProjectHeaderProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [runningTasksCount, setRunningTasksCount] = useState(0);
  const tDashboard = useTranslations("dashboard");
  const locale = useLocale();
  const dayPickerLocale = locale === "fa" ? faIR : undefined;

  const totalTasks = userTasks.length;
  const activeTasksCount = activeTasks.length;
  const duration = 2000;

  useEffect(() => {
    const increment = activeTasksCount / (duration / 50);
    const timer = setInterval(() => {
      setRunningTasksCount((prev) => {
        if (prev + increment >= activeTasksCount) {
          clearInterval(timer);
          return activeTasksCount;
        }
        return prev + increment;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [activeTasksCount]);

  useEffect(() => {
    if (activeTasksCount === 0) {
      setRunningTasksCount(0);
    }
  }, [activeTasksCount]);

  const completionPercentage =
    totalTasks === 0 ? 0 : Math.round(((totalTasks - activeTasksCount) / totalTasks) * 100);

  return (
    <div className="grid md:grid-cols-3 sm:grid-cols-1 lg:grid-cols-4 gap-x-4 md:gap-y-6 w-full auto-rows-auto">
      <div className="flex flex-col justify-between items-start p-4 gap-y-8 md:col-span-1 bg-secondary-950 rounded-lg h-64">
        <div className="flex flex-col justify-start items-start">
          <p className="text-white text-lg">{tDashboard("runningTasks")}</p>
          <p className="text-white text-[52px] font-bold">{Math.floor(runningTasksCount)}</p>
        </div>
        <div className="flex items-center justify-start gap-x-6">
          <CircularProgress
            variant="determinate"
            value={completionPercentage}
            size={90}
            sx={{ color: "white", "& .MuiCircularProgress-circle": { stroke: "white" } }}
            thickness={2}
          />
          <div className="flex flex-col justify-start items-start gap-y-[2px]">
            <p className="text-white text-lg font-bold">{totalTasks}</p>
            <p className="text-white text-lg">{tDashboard("tasksLabel")}</p>
            <p className="text-white text-sm opacity-80">{`${tDashboard("activeTasks")}: ${activeTasksCount}`}</p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 sm:col-span-1 md:col-span-1 col-span-1">
        <ActivityChart />
      </div>

      <div className="flex col-span-1 justify-center items-center gap-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border col-span-2 bg-white"
          dir={locale === "fa" ? "rtl" : "ltr"}
          locale={dayPickerLocale}
        />
      </div>
    </div>
  );
};

