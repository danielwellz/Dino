"use client";
import { useGetUserTasksQuery } from "@/state/api";
import React from "react";
import Board from "../projects/BoardView/Board";
import Loader from "@/components/Loader/Loader";
import { useTranslations } from "next-intl";

type Props = Record<string, never>;

export default function Tasks({}: Props) {
  const { data: tasks, isLoading } = useGetUserTasksQuery();
  const t = useTranslations("tasksPage");

  if (isLoading) return <Loader />;

  return (
    <div className="flex flex-col gap-y-4 px-6 py-4">
      <h1 className="text-3xl font-bold text-secondary-950">{t("title")}</h1>
      <Board id="1" tasks={tasks} setIsNewTaskModalOpen={() => {}} />
    </div>
  );
}
