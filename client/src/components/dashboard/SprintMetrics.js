import React, { useMemo } from 'react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';

const SprintMetrics = ({ tasks, sprintStartDate, sprintEndDate }) => {
  const metrics = useMemo(() => {
    if (!sprintStartDate || !sprintEndDate) {
      return null;
    }

    const start = new Date(sprintStartDate);
    const end = new Date(sprintEndDate);
    const now = new Date();
    const totalDays = differenceInDays(end, start) + 1;
    const daysElapsed = Math.max(0, differenceInDays(now, start));
    const daysRemaining = Math.max(0, differenceInDays(end, now));
    const progress = Math.min(100, (daysElapsed / totalDays) * 100);

    // Calculate story points
    const totalStoryPoints = tasks.reduce((sum, task) => {
      const points = task.custom_fields?.find(f => f.name === 'Story Points')?.value || 1;
      return sum + (parseInt(points) || 1);
    }, 0);

    const completedStoryPoints = tasks
      .filter(task => task.status === 'done')
      .reduce((sum, task) => {
        const points = task.custom_fields?.find(f => f.name === 'Story Points')?.value || 1;
        return sum + (parseInt(points) || 1);
      }, 0);

    const remainingStoryPoints = totalStoryPoints - completedStoryPoints;
    const velocity = daysElapsed > 0 ? completedStoryPoints / daysElapsed : 0;
    const projectedCompletion = velocity > 0 ? remainingStoryPoints / velocity : 0;
    const onTrack = projectedCompletion <= daysRemaining;

    // Task completion rate
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Burndown rate
    const idealBurndown = totalStoryPoints / totalDays;
    const actualBurndown = daysElapsed > 0 ? completedStoryPoints / daysElapsed : 0;
    const burndownVariance = actualBurndown - idealBurndown;

    return {
      totalDays,
      daysElapsed,
      daysRemaining,
      progress,
      totalStoryPoints,
      completedStoryPoints,
      remainingStoryPoints,
      velocity: Math.round(velocity * 10) / 10,
      projectedCompletion: Math.round(projectedCompletion),
      onTrack,
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate),
      idealBurndown: Math.round(idealBurndown * 10) / 10,
      actualBurndown: Math.round(actualBurndown * 10) / 10,
      burndownVariance: Math.round(burndownVariance * 10) / 10
    };
  }, [tasks, sprintStartDate, sprintEndDate]);

  if (!metrics) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Set sprint dates to view metrics
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sprint Progress */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sprint Progress</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {metrics.daysElapsed} / {metrics.totalDays} days
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${metrics.progress}%` }}
          />
        </div>
      </div>

      {/* Story Points */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalStoryPoints}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Points</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{metrics.completedStoryPoints}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">{metrics.remainingStoryPoints}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Remaining</div>
        </div>
      </div>

      {/* Velocity & Projection */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Velocity</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {metrics.velocity} pts/day
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Projected Completion</div>
          <div className={`text-lg font-semibold ${metrics.onTrack ? 'text-green-500' : 'text-red-500'}`}>
            {metrics.projectedCompletion} days
            {metrics.onTrack ? ' ✓' : ' ⚠'}
          </div>
        </div>
      </div>

      {/* Task Completion */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Task Completion</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {metrics.completedTasks} / {metrics.totalTasks} ({metrics.completionRate}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${metrics.completionRate}%` }}
          />
        </div>
      </div>

      {/* Burndown Analysis */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Burndown Analysis</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Ideal:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">{metrics.idealBurndown} pts/day</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Actual:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">{metrics.actualBurndown} pts/day</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500 dark:text-gray-400">Variance:</span>
            <span className={`ml-2 font-medium ${metrics.burndownVariance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {metrics.burndownVariance >= 0 ? '+' : ''}{metrics.burndownVariance} pts/day
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintMetrics;

