"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../Modal";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { toggleModal } from "@/state/globalSlice";
import {
  useCreateProjectMutation,
  useGetProjectOnboardingMetaQuery,
  useGetUsersQuery,
} from "@/state/api";
import {
  OnboardingStageDefinition,
  ProjectType,
  WorkflowTemplate,
  TeamMemberRole,
  projectStatus,
} from "@/app/types/types";
import { useTranslations, useLocale } from "next-intl";
import clsx from "clsx";

type InternalParticipant = {
  userId: number;
  role: string;
  username: string;
};

type ExternalParticipant = {
  email: string;
  role: string;
};

type InvitationLink = {
  email: string;
  role: string;
  token: string;
  url: string;
};

const defaultStage = (): OnboardingStageDefinition => ({
  titleEn: "",
  titleFa: "",
  ownerRole: TeamMemberRole.MEMBER,
});

const ProjectModal = () => {
  const t = useTranslations("projectWizard");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const isModalOpen = useAppSelector((state) => state.global.isModalOpen);

  const { data: metaData, isLoading: isMetaLoading } =
    useGetProjectOnboardingMetaQuery(undefined, {
      skip: !isModalOpen,
    });
  const { data: users = [], isLoading: isUsersLoading } = useGetUsersQuery(
    undefined,
    { skip: !isModalOpen },
  );
  const [createProject, { isLoading: isSubmitting }] =
    useCreateProjectMutation();

  const projectTypes = useMemo<ProjectType[]>(
    () => metaData?.projectTypes ?? [],
    [metaData?.projectTypes],
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<projectStatus>(projectStatus.PLANNING);
  const [selectedProjectTypeKey, setSelectedProjectTypeKey] = useState<
    string | undefined
  >(undefined);
  const [selectedWorkflowKey, setSelectedWorkflowKey] = useState<
    string | undefined
  >(undefined);
  const [stages, setStages] = useState<OnboardingStageDefinition[]>([
    defaultStage(),
  ]);
  const [internalParticipants, setInternalParticipants] = useState<
    InternalParticipant[]
  >([]);
  const [externalParticipants, setExternalParticipants] = useState<
    ExternalParticipant[]
  >([]);
  const [selectedInternalUserId, setSelectedInternalUserId] = useState("");
  const [internalRole, setInternalRole] = useState<string>(
    TeamMemberRole.MEMBER,
  );
  const [externalEmail, setExternalEmail] = useState("");
  const [externalRole, setExternalRole] = useState<string>("CLIENT");
  const [sendInvites, setSendInvites] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdLinks, setCreatedLinks] = useState<InvitationLink[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      setCurrentStep(0);
      setSuccessMessage(null);
      setApiError(null);
      setCreatedLinks([]);
    } else {
      resetWizard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const selectedProjectType = useMemo(() => {
    if (!selectedProjectTypeKey) return undefined;
    return projectTypes.find((type) => type.key === selectedProjectTypeKey);
  }, [projectTypes, selectedProjectTypeKey]);

  const workflowTemplates = useMemo<WorkflowTemplate[]>(() => {
    if (selectedProjectType?.workflows?.length) {
      return selectedProjectType.workflows;
    }
    return projectTypes.flatMap((type) => type.workflows ?? []);
  }, [projectTypes, selectedProjectType?.workflows]);

  const selectedWorkflowTemplate = useMemo(() => {
    if (!selectedWorkflowKey) return undefined;
    return workflowTemplates.find((workflow) => workflow.key === selectedWorkflowKey);
  }, [selectedWorkflowKey, workflowTemplates]);

  useEffect(() => {
    if (selectedWorkflowTemplate) {
      const templateStages =
        selectedWorkflowTemplate.stages?.map((stage, index) => ({
          titleEn: stage.titleEn,
          titleFa: stage.titleFa,
          ownerRole: stage.ownerRole ?? TeamMemberRole.MEMBER,
          order: stage.order ?? index + 1,
          metadata: stage.metadata ?? {},
        })) ?? [];
      if (templateStages.length > 0) {
        setStages(templateStages);
      }
    }
  }, [selectedWorkflowTemplate]);

  const steps = useMemo(
    () => [
      {
        id: "basics",
        title: t("steps.basics.title"),
        description: t("steps.basics.subtitle"),
      },
      {
        id: "workflow",
        title: t("steps.workflow.title"),
        description: t("steps.workflow.subtitle"),
      },
      {
        id: "participants",
        title: t("steps.participants.title"),
        description: t("steps.participants.subtitle"),
      },
      {
        id: "summary",
        title: t("steps.summary.title"),
        description: t("steps.summary.subtitle"),
      },
    ],
    [t],
  );

  const roleOptions = useMemo(
    () => [
      { value: TeamMemberRole.OWNER, label: t("roleLabels.owner") },
      { value: TeamMemberRole.ADMIN, label: t("roleLabels.admin") },
      { value: TeamMemberRole.MEMBER, label: t("roleLabels.member") },
      { value: TeamMemberRole.VIEWER, label: t("roleLabels.viewer") },
      { value: "CLIENT", label: t("roleLabels.client") },
    ],
    [t],
  );

  const statusOptions = useMemo(
    () => [
      {
        value: projectStatus.NOT_STARTED,
        label: t("steps.basics.statusOptions.notStarted"),
      },
      {
        value: projectStatus.PLANNING,
        label: t("steps.basics.statusOptions.planning"),
      },
      {
        value: projectStatus.IN_PROGRESS,
        label: t("steps.basics.statusOptions.inProgress"),
      },
      {
        value: projectStatus.COMPLETED,
        label: t("steps.basics.statusOptions.completed"),
      },
    ],
    [t],
  );

  const resetWizard = () => {
    setProjectName("");
    setProjectDescription("");
    setStartDate("");
    setEndDate("");
    setStatus(projectStatus.PLANNING);
    setSelectedProjectTypeKey(undefined);
    setSelectedWorkflowKey(undefined);
    setStages([defaultStage()]);
    setInternalParticipants([]);
    setExternalParticipants([]);
    setSelectedInternalUserId("");
    setInternalRole(TeamMemberRole.MEMBER);
    setExternalEmail("");
    setExternalRole("CLIENT");
    setSendInvites(true);
    setSuccessMessage(null);
    setApiError(null);
    setCreatedLinks([]);
    setCurrentStep(0);
  };

  const handleClose = () => {
    dispatch(toggleModal());
  };

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        ...defaultStage(),
        order: prev.length + 1,
      },
    ]);
  };

  const handleStageChange = (
    index: number,
    field: keyof OnboardingStageDefinition,
    value: string,
  ) => {
    setStages((prev) =>
      prev.map((stage, idx) =>
        idx === index
          ? {
              ...stage,
              [field]: value,
            }
          : stage,
      ),
    );
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((stage, idx) => ({ ...stage, order: idx + 1 })),
    );
  };

  const handleAddInternalParticipant = () => {
    if (!selectedInternalUserId) return;
    const userId = Number(selectedInternalUserId);
    if (internalParticipants.some((participant) => participant.userId === userId))
      return;

    const user = users.find((u) => u.userId === userId);
    if (!user) return;

    setInternalParticipants((prev) => [
      ...prev,
      {
        userId,
        role: internalRole,
        username: user.username,
      },
    ]);
    setSelectedInternalUserId("");
    setInternalRole(TeamMemberRole.MEMBER);
  };

  const handleRemoveInternalParticipant = (userId: number) => {
    setInternalParticipants((prev) =>
      prev.filter((participant) => participant.userId !== userId),
    );
  };

  const handleAddExternalParticipant = () => {
    if (!externalEmail.trim()) return;
    setExternalParticipants((prev) => [
      ...prev,
      { email: externalEmail.trim(), role: externalRole },
    ]);
    setExternalEmail("");
    setExternalRole("CLIENT");
  };

  const handleRemoveExternalParticipant = (email: string) => {
    setExternalParticipants((prev) =>
      prev.filter((participant) => participant.email !== email),
    );
  };

  const isStepValid = (stepIndex: number) => {
    if (stepIndex === 0) {
      return (
        projectName.trim().length > 0 &&
        !!selectedProjectTypeKey &&
        (selectedWorkflowKey ? true : workflowTemplates.length === 0)
      );
    }
    if (stepIndex === 1) {
      return (
        stages.length > 0 &&
        stages.every(
          (stage) =>
            stage.titleEn.trim().length > 0 && stage.titleFa.trim().length > 0,
        )
      );
    }
    if (stepIndex === 2) {
      return (
        internalParticipants.length + externalParticipants.length > 0 &&
        externalParticipants.every((participant) =>
          participant.email.includes("@"),
        )
      );
    }
    return true;
  };

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setApiError(null);
    try {
      const payload = {
        name: projectName.trim(),
        description: projectDescription.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        projectTypeKey: selectedProjectTypeKey,
        workflowTemplateKey: selectedWorkflowKey,
        stages: stages.map((stage, index) => ({
          ...stage,
          order: index + 1,
        })),
        participants: [
          ...internalParticipants.map((participant) => ({
            userId: participant.userId,
            role: participant.role,
          })),
          ...externalParticipants.map((participant) => ({
            email: participant.email,
            role: participant.role,
          })),
        ],
        sendInvites,
        metadata: { locale },
      };

      const response = await createProject(payload).unwrap();
      setSuccessMessage(t("notifications.success"));
      setCreatedLinks(response.invitations ?? []);
    } catch (error: any) {
      setApiError(
        error?.data?.message ??
          error?.message ??
          t("notifications.error"),
      );
    }
  };

  const renderBasicsStep = () => (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-gray-500">{steps[0].description}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("steps.basics.fields.name")}
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder={t("steps.basics.placeholders.name")}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("steps.basics.fields.status")}
          </label>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as projectStatus)
            }
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("steps.basics.fields.description")}
          </label>
          <textarea
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder={t("steps.basics.placeholders.description")}
            className="rounded-md border border-gray-300 px-3 py-2"
            rows={4}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("steps.basics.fields.startDate")}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("steps.basics.fields.endDate")}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("steps.basics.fields.projectType")}
          </label>
          <select
            value={selectedProjectTypeKey ?? ""}
            onChange={(event) => {
              setSelectedProjectTypeKey(
                event.target.value || undefined,
              );
              setSelectedWorkflowKey(undefined);
            }}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">
              {t("steps.basics.placeholders.projectType")}
            </option>
            {projectTypes.map((type) => (
              <option key={type.key} value={type.key}>
                {locale === "fa" ? type.nameFa : type.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            {t("steps.basics.fields.workflow")}
          </label>
          <select
            value={selectedWorkflowKey ?? ""}
            onChange={(event) =>
              setSelectedWorkflowKey(event.target.value || undefined)
            }
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">
              {t("steps.basics.placeholders.workflow")}
            </option>
            {workflowTemplates.map((workflow) => (
              <option key={workflow.key} value={workflow.key}>
                {locale === "fa" ? workflow.nameFa : workflow.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderWorkflowStep = () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">{steps[1].description}</p>
      <div className="rounded-lg border border-gray-200">
        <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
          <div className="col-span-5 md:col-span-4 lg:col-span-4">
            {t("steps.workflow.table.stage")}
          </div>
          <div className="col-span-5 md:col-span-4 lg:col-span-4">
            {t("steps.workflow.table.stageFa")}
          </div>
          <div className="col-span-4 md:col-span-3 lg:col-span-3">
            {t("steps.workflow.table.owner")}
          </div>
          <div className="col-span-12 md:col-span-1 lg:col-span-1 text-right">
            {t("steps.workflow.table.actions")}
          </div>
        </div>
        <div className="divide-y">
          {stages.map((stage, index) => (
            <div
              key={`${stage.titleEn}-${index}`}
              className="grid grid-cols-12 gap-2 px-4 py-3"
            >
              <input
                value={stage.titleEn}
                onChange={(event) =>
                  handleStageChange(index, "titleEn", event.target.value)
                }
                placeholder={t("steps.workflow.placeholders.stageEn")}
                className="col-span-5 md:col-span-4 lg:col-span-4 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={stage.titleFa}
                onChange={(event) =>
                  handleStageChange(index, "titleFa", event.target.value)
                }
                placeholder={t("steps.workflow.placeholders.stageFa")}
                className="col-span-5 md:col-span-4 lg:col-span-4 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={stage.ownerRole ?? TeamMemberRole.MEMBER}
                onChange={(event) =>
                  handleStageChange(index, "ownerRole", event.target.value)
                }
                className="col-span-4 md:col-span-3 lg:col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="col-span-12 flex justify-end md:col-span-1 lg:col-span-1">
                <button
                  type="button"
                  onClick={() => handleRemoveStage(index)}
                  className="rounded-md border border-transparent p-2 text-gray-500 hover:text-red-500"
                  aria-label={t("steps.workflow.remove")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleAddStage}
            className="inline-flex items-center gap-2 rounded-md border border-dashed border-primary-500 px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50"
          >
            <Plus size={16} />
            {t("steps.workflow.addStage")}
          </button>
        </div>
      </div>
      {stages.length === 0 && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {t("empty.noStages")}
        </p>
      )}
    </div>
  );

  const renderParticipantsStep = () => (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500">{steps[2].description}</p>

      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800">
          {t("steps.participants.internalHeading")}
        </h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">
              {t("steps.participants.selectUser")}
            </label>
            <select
              value={selectedInternalUserId}
              onChange={(event) => setSelectedInternalUserId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              disabled={isUsersLoading}
            >
              <option value="">
                {t("steps.participants.placeholders.selectUser")}
              </option>
              {users.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.username} · {user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-48">
            <label className="text-xs font-medium text-gray-500">
              {t("steps.participants.selectRole")}
            </label>
            <select
              value={internalRole}
              onChange={(event) => setInternalRole(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {roleOptions.slice(0, 4).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddInternalParticipant}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedInternalUserId}
          >
            {t("steps.participants.addInternal")}
          </button>
        </div>
        {internalParticipants.length > 0 && (
          <ul className="mt-4 space-y-2">
            {internalParticipants.map((participant) => (
              <li
                key={participant.userId}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{participant.username}</p>
                  <p className="text-xs text-gray-500">
                    {t("roleLabelsShort." + participant.role)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveInternalParticipant(participant.userId)
                  }
                  className="text-gray-500 transition hover:text-red-500"
                >
                  {t("steps.participants.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800">
          {t("steps.participants.externalHeading")}
        </h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">
              {t("steps.participants.fields.email")}
            </label>
            <input
              type="email"
              value={externalEmail}
              onChange={(event) => setExternalEmail(event.target.value)}
              placeholder={t("steps.participants.placeholders.email")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:w-48">
            <label className="text-xs font-medium text-gray-500">
              {t("steps.participants.selectRole")}
            </label>
            <select
              value={externalRole}
              onChange={(event) => setExternalRole(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddExternalParticipant}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!externalEmail.includes("@")}
          >
            {t("steps.participants.addExternal")}
          </button>
        </div>
        {externalParticipants.length > 0 && (
          <ul className="mt-4 space-y-2">
            {externalParticipants.map((participant) => (
              <li
                key={participant.email}
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{participant.email}</p>
                  <p className="text-xs text-gray-500">
                    {t("roleLabelsShort." + participant.role)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveExternalParticipant(participant.email)
                  }
                  className="text-gray-500 transition hover:text-red-500"
                >
                  {t("steps.participants.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex items-center gap-3 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={sendInvites}
          onChange={(event) => setSendInvites(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        {t("steps.participants.sendInvites")}
      </label>

      {internalParticipants.length + externalParticipants.length === 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {t("empty.noParticipants")}
        </p>
      )}
    </div>
  );

  const renderSummaryStep = () => {
    const stageDisplay = stages.map((stage, index) => ({
      label: locale === "fa" ? stage.titleFa : stage.titleEn,
      owner: t("roleLabelsShort." + (stage.ownerRole ?? TeamMemberRole.MEMBER)),
      order: index + 1,
    }));

    const participantDisplay = [
      ...internalParticipants.map((participant) => ({
        label: participant.username,
        role: t("roleLabelsShort." + participant.role),
      })),
      ...externalParticipants.map((participant) => ({
        label: participant.email,
        role: t("roleLabelsShort." + participant.role),
      })),
    ];

    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800">
            {t("steps.summary.overviewTitle")}
          </h3>
          <dl className="mt-4 space-y-3 text-sm text-gray-700">
            <div className="flex justify-between gap-4">
              <dt>{t("steps.summary.projectName")}</dt>
              <dd className="font-medium text-gray-900">{projectName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t("steps.summary.projectType")}</dt>
              <dd className="font-medium text-gray-900">
                {selectedProjectType
                  ? locale === "fa"
                    ? selectedProjectType.nameFa
                    : selectedProjectType.nameEn
                  : "—"}
              </dd>
            </div>
            <div className="flex justify_between gap-4">
              <dt>{t("steps.summary.workflow")}</dt>
              <dd className="font-medium text-gray-900">
                {selectedWorkflowTemplate
                  ? locale === "fa"
                    ? selectedWorkflowTemplate.nameFa
                    : selectedWorkflowTemplate.nameEn
                  : t("steps.summary.customWorkflow")}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("steps.summary.stages")}
            </h4>
            <ul className="mt-2 space-y-1 text-sm">
              {stageDisplay.map((stage) => (
                <li
                  key={`${stage.order}-${stage.label}`}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                >
                  <span>
                    {stage.order}. {stage.label}
                  </span>
                  <span className="text-xs text-gray-500">{stage.owner}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("steps.summary.participants")}
            </h4>
            <ul className="mt-2 space-y-1 text-sm">
              {participantDisplay.map((participant) => (
                <li
                  key={`${participant.label}-${participant.role}`}
                  className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
                >
                  <span>{participant.label}</span>
                  <span className="text-xs text-gray-500">
                    {participant.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50/60 p-4">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-600">
            {t("aiCard.badge")}
          </span>
          <h3 className="mt-2 text-base font-semibold text-primary-900">
            {t("aiCard.title")}
          </h3>
          <p className="mt-1 text-sm text-primary-800">{t("aiCard.description")}</p>
        </div>

        {successMessage && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMessage}
          </div>
        )}
        {apiError && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {apiError}
          </div>
        )}
        {createdLinks.length > 0 && (
          <div className="rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-800">
              {t("steps.summary.invitations")}
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {createdLinks.map((link) => (
                <li key={link.token} className="flex flex-col">
                  <span className="font-medium">{link.email}</span>
                  <span className="text-xs text-gray-500">
                    {link.role} · {link.url}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    if (isMetaLoading) {
      return (
        <div className="flex h-48 items-center justify-center">
          <CircularProgress size={24} />
        </div>
      );
    }

    switch (currentStep) {
      case 0:
        return renderBasicsStep();
      case 1:
        return renderWorkflowStep();
      case 2:
        return renderParticipantsStep();
      case 3:
        return renderSummaryStep();
      default:
        return null;
    }
  };

  const buttonLabel = () => {
    if (currentStep === steps.length - 1) {
      return isSubmitting ? (
        <span className="flex items-center gap-2">
          <CircularProgress size={16} />
          {t("actions.launch")}
        </span>
      ) : (
        t("actions.launch")
      );
    }
    return t("actions.next");
  };

  const handlePrimaryAction = () => {
    if (currentStep === steps.length - 1) {
      void handleSubmit();
    } else {
      goToNextStep();
    }
  };

  return (
    <Modal
      title={`${t("title")} · ${t(`steps.${steps[currentStep].id}.title`)}`}
      isOpen={isModalOpen}
      onClose={handleClose}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={clsx(
                    "flex min-w-[32px] items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition",
                    index === currentStep
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-300 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600",
                  )}
                >
                  {index + 1}
                </button>
                {index < steps.length - 1 && (
                  <span className="h-px flex-1 bg-gray-200" />
                )}
              </React.Fragment>
            ))}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {steps[currentStep].title}
            </h2>
            <p className="text-sm text-gray-500">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {renderStepContent()}

        <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goToPreviousStep}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentStep === 0 || isSubmitting}
          >
            {t("actions.back")}
          </button>
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="inline-flex min-w-[140px] items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isStepValid(currentStep) || isSubmitting}
          >
            {buttonLabel()}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectModal;
