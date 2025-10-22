'use client'
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Board from "../BoardView/Board";
import NewTaskModal from "@/components/TaskModal";
import { useParams } from "next/navigation";
import Graph from "../GraphView/Graph";
import ListView from "../ListView/List";
import {
  useGetProjectByIdQuery,
  useGetProjectTasksQuery,
  useGetProjectTeamMembersQuery,
} from "@/state/api";
import InviteMemberModal from "@/components/InviteMemberModal";
import GanttGraph from "../GanttView/Gantt";
import Loader from "@/components/Loader/Loader";
import AssetWorkspace from "./AssetWorkspace";
import MoodboardWorkspace from "./MoodboardWorkspace";
import StoryboardWorkspace from "./StoryboardWorkspace";
import ScenarioWorkspace from "./ScenarioWorkspace";
import { useLocale } from "next-intl";
import { getLocalizedAvatarPlaceholder } from "@/lib/avatar";


const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const locale = useLocale();
  const placeholderAvatar = getLocalizedAvatarPlaceholder(locale);

  const { data: project, isLoading, isError} = useGetProjectByIdQuery({projectId: id});
  const {data:projectTeamMembers} = useGetProjectTeamMembersQuery({projectId: id});
  const { data: tasks, isLoading: isLoadingTasks } = useGetProjectTasksQuery({ projectId: id },{refetchOnMountOrArgChange: true, refetchOnReconnect: true});
  
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<
    "TASKS" | "ASSETS" | "MOODBOARD" | "STORYBOARD" | "SCENARIO"
  >("TASKS");
  const [taskView, setTaskView] = useState("BOARD");
  const isAllLoading = isLoading || isLoadingTasks;
  if (isAllLoading) return <Loader />;
  
  return (
    <div className='flex flex-col justify-start w-full gap-y-6 p-10'>

      {/* New Task Modal and Task details Modal */}
      <InviteMemberModal  isOpen={isInviteMemberModalOpen} onClose={()=>setIsInviteMemberModalOpen(false)}/>
      <NewTaskModal projectId={id} isOpen={isNewTaskModalOpen} onClose={()=>setIsNewTaskModalOpen(false)}/>
      

      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:justify-between lg:items-center md:flex-col md:items-start sm:items-start sm:flex-col items-start w-full gap-y-6 border-b border-gray-200 pb-4'>
        
        <div><h1 className='text-3xl font-semibold text-secondary-950'>{project?.name}</h1></div>
        
        <div className='flex justify-end items-center gap-x-4'>
          {/* Invite button */}
          <div className="flex items-center gap-x-2">
            <button className='bg-primary-600 bg-opacity-40 text-white p-1 rounded-md' onClick={() => setIsInviteMemberModalOpen(true)}>
              <Plus size={14} className='text-primary-600'/>
            </button>
            <p className='text-sm text-primary-600'>Invite</p>
          </div>
          {/* project team members avatars*/}
          <AvatarGroup total={projectTeamMembers?.length} spacing="medium">
            {projectTeamMembers?.map((teamMember) => (
              <Avatar
                key={teamMember.userId}
                src={teamMember.user.profilePictureUrl ?? placeholderAvatar}
              />
            ))}
          </AvatarGroup>
        </div>
      </div>
      {/* Project Details */}
      <div className='flex flex-col gap-y-4'>
        <h3 className='text-lg font-semibold text-secondary-950'>Project Details :</h3>
        <p className='text-sm text-gray-600 leading-tight tracking-tight w-1/2 '>{project?.description}</p>
      </div>
      {/* Workspace Selector */}
      <div className='flex flex-col gap-y-3'>
        <h2 className='text-lg font-semibold text-secondary-950'>Workspace</h2>
        <div className='flex flex-wrap items-center gap-3'>
          {[
            { key: "TASKS", label: "Tasks" },
            { key: "ASSETS", label: "Assets" },
            { key: "MOODBOARD", label: "Moodboard" },
            { key: "STORYBOARD", label: "Storyboard" },
            { key: "SCENARIO", label: "Scenario" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`rounded-full px-4 py-2 text-sm transition ${activeWorkspace === tab.key ? "bg-secondary-950 text-white" : "bg-gray-100 text-secondary-950 hover:bg-gray-200"}`}
              onClick={() => setActiveWorkspace(tab.key as typeof activeWorkspace)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Project Tasks */}
      {activeWorkspace === "TASKS" && (
        <div className='flex flex-col gap-y-4'>
          <h1 className='text-lg font-semibold text-secondary-950'>Tasks :</h1>
          {/* View Tabs */}
          <div className='flex justify-start items-center gap-x-4'>
            <button className={`text-md text-secondary-950 px-2 ${taskView === "BOARD" ? "font-semibold border-b-2 border-secondary-950" : ""}` } onClick={() => setTaskView("BOARD")}>Board</button>
            <button className={`text-md text-secondary-950 px-2 ${taskView === "LIST" ? "font-semibold border-b-2 border-secondary-950" : ""}` } onClick={() => setTaskView("LIST")}>List</button>
            <button className={`text-md text-secondary-950 px-2${taskView === "GRAPH" ? "font-semibold border-b-2 border-secondary-950" : ""}` } onClick={() => setTaskView("GRAPH")}>Graph</button>
            <button className={`text-md text-secondary-950 px-2${taskView === "GANTT" ? "font-semibold border-b-2 border-secondary-950" : ""}` } onClick={() => setTaskView("GANTT")}>Gantt</button>
          </div>
        
          {taskView === "BOARD" && (
            <Board id={id} tasks={tasks} setIsNewTaskModalOpen={setIsNewTaskModalOpen}/>
          )}
          {taskView === "LIST" && (
            <ListView id={id} />
          )}  
          {taskView === "GRAPH" && (
            <Graph id={id} />
          )}
          {taskView === "GANTT" && (
            <GanttGraph  id={id} projectTasks={tasks} />
          )}  
          
        </div>
      )}
      {activeWorkspace === "ASSETS" && (
        <AssetWorkspace projectId={id} teamId={project?.teamId} />
      )}
      {activeWorkspace === "MOODBOARD" && (
        <MoodboardWorkspace projectId={id} />
      )}
      {activeWorkspace === "STORYBOARD" && (
        <StoryboardWorkspace projectId={id} />
      )}
      {activeWorkspace === "SCENARIO" && (
        <ScenarioWorkspace projectId={id} />
      )}
    </div>
  )
}

export default ProjectPage

