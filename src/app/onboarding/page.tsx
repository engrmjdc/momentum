"use client";

import { useState } from "react";

const TOTAL_STEPS = 5;

type MeasurementType = "sessions" | "minutes" | "count";

type Goal = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  isCustom: boolean;
  measurementType: MeasurementType;
  weeklyTarget: number;
  defaultDuration: number;
};

const STARTER_GOALS: Goal[] = [
  {
    id: "health-fitness",
    name: "Health & Fitness",
    icon: "💪",
    description: "Exercise, move, and take care of your body.",
    isCustom: false,
    measurementType: "sessions",
    weeklyTarget: 3,
    defaultDuration: 45,
  },
  {
    id: "career",
    name: "Career",
    icon: "💼",
    description: "Build skills and grow professionally.",
    isCustom: false,
    measurementType: "sessions",
    weeklyTarget: 3,
    defaultDuration: 45,
  },
  {
    id: "personal-projects",
    name: "Personal Projects",
    icon: "🚀",
    description: "Turn ideas into things you've built.",
    isCustom: false,
    measurementType: "minutes",
    weeklyTarget: 240,
    defaultDuration: 60,
  },
  {
    id: "side-income",
    name: "Side Income",
    icon: "💰",
    description: "Create additional income opportunities.",
    isCustom: false,
    measurementType: "count",
    weeklyTarget: 5,
    defaultDuration: 30,
  },
  {
    id: "learning",
    name: "Learning",
    icon: "📚",
    description: "Make consistent time to learn.",
    isCustom: false,
    measurementType: "sessions",
    weeklyTarget: 3,
    defaultDuration: 30,
  },
  {
    id: "content-creation",
    name: "Content Creation",
    icon: "🎬",
    description: "Create and publish consistently.",
    isCustom: false,
    measurementType: "count",
    weeklyTarget: 14,
    defaultDuration: 30,
  },
];

const CUSTOM_ICONS = [
  "🎯",
  "💪",
  "💼",
  "🚀",
  "📚",
  "🎨",
  "💰",
  "🧘",
  "🎸",
  "💻",
  "🏃",
  "✍️",
  "🌱",
  "❤️",
  "✨",
];

const DURATION_OPTIONS = [15, 25, 30, 45, 60, 90];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  const [goals, setGoals] = useState<Goal[]>(STARTER_GOALS);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  const [customGoalOpen, setCustomGoalOpen] = useState(false);
  const [customGoalName, setCustomGoalName] = useState("");
  const [customGoalIcon, setCustomGoalIcon] = useState("🎯");
  const [customGoalError, setCustomGoalError] = useState<string | null>(
    null
  );

  const selectedGoals = goals.filter((goal) =>
    selectedGoalIds.includes(goal.id)
  );

  function toggleGoal(goalId: string) {
    setSelectedGoalIds((current) =>
      current.includes(goalId)
        ? current.filter((id) => id !== goalId)
        : [...current, goalId]
    );
  }

  function updateGoal(
    goalId: string,
    updates: Partial<Goal>
  ) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? { ...goal, ...updates }
          : goal
      )
    );
  }

  function openCustomGoal() {
    setCustomGoalName("");
    setCustomGoalIcon("🎯");
    setCustomGoalError(null);
    setCustomGoalOpen(true);
  }

  function closeCustomGoal() {
    setCustomGoalOpen(false);
    setCustomGoalName("");
    setCustomGoalIcon("🎯");
    setCustomGoalError(null);
  }

  function addCustomGoal() {
    const trimmedName = customGoalName.trim();

    if (!trimmedName) {
      setCustomGoalError("Enter a goal name.");
      return;
    }

    if (trimmedName.length > 40) {
      setCustomGoalError(
        "Goal names can be up to 40 characters."
      );
      return;
    }

    const duplicateExists = goals.some(
      (goal) =>
        goal.name.trim().toLowerCase() ===
        trimmedName.toLowerCase()
    );

    if (duplicateExists) {
      setCustomGoalError(
        "A goal with this name already exists."
      );
      return;
    }

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      name: trimmedName,
      icon: customGoalIcon,
      description: "Your custom goal.",
      isCustom: true,
      measurementType: "sessions",
      weeklyTarget: 3,
      defaultDuration: 30,
    };

    setGoals((current) => [...current, newGoal]);

    setSelectedGoalIds((current) => [
      ...current,
      newGoal.id,
    ]);

    closeCustomGoal();
  }

  function deleteCustomGoal(goalId: string) {
    setGoals((current) =>
      current.filter((goal) => goal.id !== goalId)
    );

    setSelectedGoalIds((current) =>
      current.filter((id) => id !== goalId)
    );
  }

  function nextStep() {
    if (step === 2 && selectedGoals.length === 0) {
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
    }
  }

  function previousStep() {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  const continueDisabled =
    step === 2 && selectedGoals.length === 0;

  return (
    <main className="min-h-screen bg-[#f7f9f6] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <div className="text-xl font-bold text-[#3f5f45]">
            Momentum
          </div>

          <div className="text-sm text-gray-500">
            {step} of {TOTAL_STEPS}
          </div>
        </header>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#45634c] transition-all duration-300"
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>

        <section className="flex min-h-[65vh] items-center justify-center py-12">
          <div className="w-full">
            {step === 1 && <WelcomeStep />}

            {step === 2 && (
              <GoalsStep
                goals={goals}
                selectedGoalIds={selectedGoalIds}
                toggleGoal={toggleGoal}
                openCustomGoal={openCustomGoal}
                deleteCustomGoal={deleteCustomGoal}
              />
            )}

            {step === 3 && (
              <WeeklyTargetsStep
                goals={selectedGoals}
                updateGoal={updateGoal}
              />
            )}

            {step > 3 && (
              <PlaceholderStep step={step} />
            )}
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 1}
            className="rounded-xl px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:invisible"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={nextStep}
            disabled={continueDisabled}
            className="rounded-xl bg-[#45634c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#395440] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue →
          </button>
        </footer>
      </div>

      {customGoalOpen && (
        <CustomGoalModal
          name={customGoalName}
          setName={setCustomGoalName}
          icon={customGoalIcon}
          setIcon={setCustomGoalIcon}
          error={customGoalError}
          close={closeCustomGoal}
          add={addCustomGoal}
        />
      )}
    </main>
  );
}

/* =========================================================
   STEP 1 — WELCOME
========================================================= */

function WelcomeStep() {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7eee8] text-3xl">
        🌱
      </div>

      <p className="mt-8 text-sm font-medium uppercase tracking-[0.2em] text-[#52735a]">
        Welcome to Momentum
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
        Build progress that lasts.
      </h1>

      <p className="mx-auto mt-5 max-w-md text-base leading-7 text-gray-500">
        Momentum helps you focus on what matters without
        trying to do everything every day.
      </p>

      <div className="mx-auto mt-10 grid max-w-lg gap-3 text-left sm:grid-cols-3">
        <WelcomeCard
          icon="🎯"
          title="Choose goals"
          description="Decide what matters."
        />

        <WelcomeCard
          icon="⏱️"
          title="Focus"
          description="Give it your attention."
        />

        <WelcomeCard
          icon="🔥"
          title="Stay consistent"
          description="Build momentum."
        />
      </div>
    </div>
  );
}

function WelcomeCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xl">{icon}</div>

      <p className="mt-3 font-medium text-gray-900">
        {title}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   STEP 2 — GOALS
========================================================= */

function GoalsStep({
  goals,
  selectedGoalIds,
  toggleGoal,
  openCustomGoal,
  deleteCustomGoal,
}: {
  goals: Goal[];
  selectedGoalIds: string[];
  toggleGoal: (goalId: string) => void;
  openCustomGoal: () => void;
  deleteCustomGoal: (goalId: string) => void;
}) {
  const selectedCount = selectedGoalIds.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#52735a]">
          Your Goals
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">
          What do you want to improve?
        </h1>

        <p className="mt-4 text-gray-500">
          Choose what matters right now. You can always
          change these later.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {goals.map((goal) => {
          const selected =
            selectedGoalIds.includes(goal.id);

          return (
            <div
              key={goal.id}
              className="relative"
            >
              <button
                type="button"
                onClick={() => toggleGoal(goal.id)}
                aria-pressed={selected}
                className={`h-full w-full rounded-2xl border p-5 text-left transition ${
                  selected
                    ? "border-[#45634c] bg-[#eef4ef] ring-1 ring-[#45634c]"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {selected && (
                  <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#45634c] text-xs text-white">
                    ✓
                  </div>
                )}

                <div className="text-2xl">
                  {goal.icon}
                </div>

                <h2 className="mt-4 pr-8 font-semibold text-gray-900">
                  {goal.name}
                </h2>

                <p className="mt-1 pr-6 text-sm leading-6 text-gray-500">
                  {goal.description}
                </p>
              </button>

              {goal.isCustom && (
                <button
                  type="button"
                  aria-label={`Delete ${goal.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteCustomGoal(goal.id);
                  }}
                  className="absolute bottom-4 right-4 rounded-lg px-2 py-1 text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openCustomGoal}
        className="mt-4 w-full rounded-2xl border border-dashed border-gray-300 bg-transparent p-4 text-sm font-medium text-[#45634c] transition hover:border-[#45634c] hover:bg-[#eef4ef]"
      >
        + Create your own goal
      </button>

      <p className="mt-5 text-center text-sm text-gray-400">
        {selectedCount === 0
          ? "Select at least one goal to continue."
          : `${selectedCount} ${
              selectedCount === 1
                ? "goal"
                : "goals"
            } selected`}
      </p>
    </div>
  );
}

/* =========================================================
   STEP 3 — WEEKLY TARGETS
========================================================= */

function WeeklyTargetsStep({
  goals,
  updateGoal,
}: {
  goals: Goal[];
  updateGoal: (
    goalId: string,
    updates: Partial<Goal>
  ) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#52735a]">
          Weekly Targets
        </p>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">
          What does progress look like?
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-gray-500">
          Set realistic weekly targets. Momentum is about
          consistency, not filling every hour of your week.
        </p>
      </div>

      <div className="mt-10 space-y-4">
        {goals.map((goal) => (
          <GoalTargetCard
            key={goal.id}
            goal={goal}
            updateGoal={updateGoal}
          />
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-[#eef4ef] p-4 text-sm leading-6 text-[#45634c]">
        🌱 Start with targets you can sustain. You can always
        increase them later.
      </div>
    </div>
  );
}

function GoalTargetCard({
  goal,
  updateGoal,
}: {
  goal: Goal;
  updateGoal: (
    goalId: string,
    updates: Partial<Goal>
  ) => void;
}) {
  function changeMeasurement(
    measurementType: MeasurementType
  ) {
    let weeklyTarget = goal.weeklyTarget;

    if (measurementType === "sessions") {
      weeklyTarget = 3;
    }

    if (measurementType === "minutes") {
      weeklyTarget = 120;
    }

    if (measurementType === "count") {
      weeklyTarget = 5;
    }

    updateGoal(goal.id, {
      measurementType,
      weeklyTarget,
    });
  }

  function decrementTarget() {
    const step =
      goal.measurementType === "minutes"
        ? 15
        : 1;

    const minimum =
      goal.measurementType === "minutes"
        ? 15
        : 1;

    updateGoal(goal.id, {
      weeklyTarget: Math.max(
        minimum,
        goal.weeklyTarget - step
      ),
    });
  }

  function incrementTarget() {
    const step =
      goal.measurementType === "minutes"
        ? 15
        : 1;

    updateGoal(goal.id, {
      weeklyTarget:
        goal.weeklyTarget + step,
    });
  }

  const targetUnit =
    goal.measurementType === "sessions"
      ? goal.weeklyTarget === 1
        ? "session"
        : "sessions"
      : goal.measurementType === "minutes"
        ? "minutes"
        : goal.weeklyTarget === 1
          ? "item"
          : "items";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2f5f2] text-xl">
          {goal.icon}
        </div>

        <div>
          <h2 className="font-semibold text-gray-900">
            {goal.name}
          </h2>

          <p className="text-sm text-gray-500">
            Weekly progress target
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`measurement-${goal.id}`}
            className="block text-sm font-medium text-gray-700"
          >
            Measure progress by
          </label>

          <select
            id={`measurement-${goal.id}`}
            value={goal.measurementType}
            onChange={(event) =>
              changeMeasurement(
                event.target
                  .value as MeasurementType
              )
            }
            className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
          >
            <option value="sessions">
              Sessions
            </option>

            <option value="minutes">
              Minutes
            </option>

            <option value="count">
              Count
            </option>
          </select>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700">
            Weekly target
          </p>

          <div className="mt-2 flex min-h-[50px] items-center justify-between rounded-xl border border-gray-300 px-2">
            <button
              type="button"
              onClick={decrementTarget}
              aria-label={`Decrease ${goal.name} weekly target`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-gray-600 transition hover:bg-gray-100"
            >
              −
            </button>

            <div className="min-w-0 px-2 text-center">
              <span className="font-semibold text-gray-900">
                {goal.weeklyTarget}
              </span>

              <span className="ml-1 text-sm text-gray-500">
                {targetUnit}
              </span>
            </div>

            <button
              type="button"
              onClick={incrementTarget}
              aria-label={`Increase ${goal.name} weekly target`}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-gray-600 transition hover:bg-gray-100"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-gray-700">
          Typical focus session
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((duration) => {
            const selected =
              goal.defaultDuration === duration;

            return (
              <button
                key={duration}
                type="button"
                onClick={() =>
                  updateGoal(goal.id, {
                    defaultDuration: duration,
                  })
                }
                aria-pressed={selected}
                className={`min-w-[64px] rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  selected
                    ? "border-[#45634c] bg-[#eef4ef] text-[#45634c] ring-1 ring-[#45634c]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {duration}m
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CUSTOM GOAL MODAL
========================================================= */

function CustomGoalModal({
  name,
  setName,
  icon,
  setIcon,
  error,
  close,
  add,
}: {
  name: string;
  setName: (value: string) => void;
  icon: string;
  setIcon: (value: string) => void;
  error: string | null;
  close: () => void;
  add: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-[#52735a]">
              Custom Goal
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-gray-900">
              Create your own goal
            </h2>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="mt-7">
          <label
            htmlFor="custom-goal-name"
            className="block text-sm font-medium text-gray-700"
          >
            Goal name
          </label>

          <input
            id="custom-goal-name"
            type="text"
            value={name}
            maxLength={40}
            autoFocus
            placeholder="e.g. Practice Guitar"
            onChange={(event) =>
              setName(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                add();
              }
            }}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#52735a] focus:ring-2 focus:ring-[#52735a]/15"
          />

          <div className="mt-2 flex justify-between gap-4">
            <div>
              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            <p className="shrink-0 text-xs text-gray-400">
              {name.length}/40
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700">
            Choose an icon
          </p>

          <div className="mt-3 grid grid-cols-5 gap-2">
            {CUSTOM_ICONS.map((item) => {
              const selected = item === icon;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIcon(item)}
                  aria-label={`Choose ${item} icon`}
                  aria-pressed={selected}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-xl transition ${
                    selected
                      ? "border-[#45634c] bg-[#eef4ef] ring-1 ring-[#45634c]"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-5 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={add}
            className="rounded-xl bg-[#45634c] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#395440]"
          >
            Add goal
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TEMPORARY STEPS 4–5
========================================================= */

function PlaceholderStep({
  step,
}: {
  step: number;
}) {
  const content: Record<
    number,
    {
      label: string;
      title: string;
      description: string;
    }
  > = {
    4: {
      label: "Your Routine",
      title: "Make time for what matters.",
      description:
        "Next we'll choose which days you want to work on each goal.",
    },

    5: {
      label: "Focus Setup",
      title: "Find your focus rhythm.",
      description:
        "Next we'll configure Pomodoro, Deep Focus, and your preferred session lengths.",
    },
  };

  const current = content[step];

  return (
    <div className="mx-auto max-w-xl text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#52735a]">
        {current.label}
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-gray-900">
        {current.title}
      </h1>

      <p className="mx-auto mt-4 max-w-md leading-7 text-gray-500">
        {current.description}
      </p>
    </div>
  );
}