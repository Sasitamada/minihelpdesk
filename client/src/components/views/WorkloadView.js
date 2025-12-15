import React, { useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval, format } from 'date-fns';

const generateWeeks = (count = 4) => {
  const weeks = [];
  let cursor = startOfWeek(new Date());
  for (let i = 0; i < count; i++) {
    const start = addWeeks(cursor, i);
    weeks.push({
      start,
      end: endOfWeek(start),
      label: `${format(start, 'MMM dd')} - ${format(endOfWeek(start), 'MMM dd')}`
    });
  }
  return weeks;
};

const WorkloadView = ({ tasks = [], members = [], onTaskClick }) => {
  const [visibleWeeks, setVisibleWeeks] = useState(4);
  const weeks = useMemo(() => generateWeeks(visibleWeeks), [visibleWeeks]);

  const assigneePool = useMemo(() => {
    const pool = members.map(member => ({
      id: member.user_id || member.id,
      name: member.full_name || member.username || 'Member',
      avatar: member.avatar
    }));

    // include any ad-hoc assignees present on tasks
    tasks.forEach(task => {
      (task.assignees || []).forEach(assignee => {
        const id = assignee.user_id || assignee.id;
        if (id && !pool.find(m => m.id === id)) {
          pool.push({
            id,
            name: assignee.full_name || assignee.username || 'Member',
            avatar: assignee.avatar
          });
        }
      });
    });

    // ensure unassigned bucket
    pool.push({ id: 'unassigned', name: 'Unassigned' });
    return pool;
  }, [members, tasks]);

  const workload = useMemo(() => {
    return assigneePool.map(assignee => {
      const weekly = weeks.map(week => {
        const weekTasks = tasks.filter(task => {
          const isAssigned =
            assignee.id === 'unassigned'
              ? !task.assignees || task.assignees.length === 0
              : (task.assignees || []).some(a => (a.user_id || a.id) === assignee.id);
          if (!isAssigned) return false;
          if (!task.due_date) return false;
          const due = new Date(task.due_date);
          return isWithinInterval(due, { start: week.start, end: week.end });
        });
        return weekTasks;
      });
      return { assignee, weekly };
    });
  }, [assigneePool, weeks, tasks]);

  const maxLoad = Math.max(
    1,
    ...workload.flatMap(entry => entry.weekly.map(weekTasks => weekTasks.length))
  );

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Workload Overview</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#6c757d' }}>Weeks visible</label>
          <select
            value={visibleWeeks}
            onChange={(e) => setVisibleWeeks(parseInt(e.target.value, 10))}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e0e0e0' }}
          >
            {[4, 6, 8].map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `220px repeat(${weeks.length}, 1fr)`,
          gap: '12px',
          alignItems: 'stretch'
        }}
      >
        <div />
        {weeks.map(week => (
          <div
            key={week.label}
            style={{
              textAlign: 'center',
              fontWeight: '600',
              color: '#6c757d'
            }}
          >
            {week.label}
          </div>
        ))}

        {workload.map(entry => (
          <React.Fragment key={entry.assignee.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#e8ecff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  color: '#6b5ce6'
                }}
              >
                {entry.assignee.name.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <div>{entry.assignee.name}</div>
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  {entry.weekly.reduce((sum, weekTasks) => sum + weekTasks.length, 0)} tasks
                </div>
              </div>
            </div>

            {entry.weekly.map((weekTasks, idx) => {
              const loadRatio = weekTasks.length / maxLoad;
              return (
                <div
                  key={`${entry.assignee.id}-${idx}`}
                  style={{
                    background: '#f7f8f9',
                    borderRadius: '8px',
                    padding: '8px',
                    minHeight: '80px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '999px',
                      background: loadRatio > 0.8 ? '#dc3545' : loadRatio > 0.5 ? '#fd7e14' : '#2ecc71',
                      width: `${Math.min(100, loadRatio * 100)}%`,
                      transition: 'width 0.2s'
                    }}
                  />
                  <div style={{ fontSize: '12px', marginTop: '6px', fontWeight: '600' }}>
                    {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {weekTasks.slice(0, 3).map(task => (
                      <button
                        key={task.id || task._id}
                        onClick={() => onTaskClick(task)}
                        style={{
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          color: '#6b5ce6',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        • {task.title}
                      </button>
                    ))}
                    {weekTasks.length > 3 && (
                      <span style={{ fontSize: '11px', color: '#6c757d' }}>
                        +{weekTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {assigneePool.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
          No members or tasks to display.
        </div>
      )}
    </div>
  );
};

export default WorkloadView;


