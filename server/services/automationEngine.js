/**
 * Automation Engine - Executes automations based on triggers
 */

class AutomationEngine {
  constructor(pool, io) {
    this.pool = pool;
    this.io = io;
  }

  /**
   * Execute automations for a trigger
   * @param {string} triggerType - Type of trigger (task_created, status_changed, due_date_close)
   * @param {object} context - Context data for the trigger
   */
  async executeAutomations(triggerType, context) {
    try {
      // Get all enabled automations for this trigger type
      const { rows: automations } = await this.pool.query(
        `SELECT * FROM automations 
         WHERE trigger_type = $1 
         AND enabled = TRUE
         AND workspace_id = $2`,
        [triggerType, context.workspaceId]
      );

      for (const automation of automations) {
        // Check if trigger conditions are met
        if (this.checkTriggerConditions(automation, context)) {
          // Execute the action
          await this.executeAction(automation, context);
        }
      }
    } catch (error) {
      console.error('Error executing automations:', error);
    }
  }

  /**
   * Check if trigger conditions are met
   */
  checkTriggerConditions(automation, context) {
    const conditions = automation.trigger_conditions || {};
    
    // For now, all conditions pass (can be extended)
    // Example: check if status matches, if project matches, etc.
    if (conditions.status && context.status !== conditions.status) {
      return false;
    }
    
    if (conditions.projectId && context.projectId !== conditions.projectId) {
      return false;
    }

    return true;
  }

  /**
   * Execute the automation action
   */
  async executeAction(automation, context) {
    const actionType = automation.action_type;
    const actionData = automation.action_data || {};

    try {
      switch (actionType) {
        case 'assign_user':
          await this.assignUser(context.taskId, actionData.userId, context.workspaceId);
          break;
        
        case 'notify':
          await this.sendNotification(actionData, context);
          break;
        
        case 'send_reminder':
          await this.sendReminder(context.taskId, actionData, context.workspaceId);
          break;
        
        default:
          console.log(`Unknown action type: ${actionType}`);
      }
    } catch (error) {
      console.error(`Error executing action ${actionType}:`, error);
    }
  }

  /**
   * Assign user to task
   */
  async assignUser(taskId, userId, workspaceId) {
    try {
      // Check if already assigned
      const existing = await this.pool.query(
        'SELECT id FROM task_assignees WHERE task_id = $1 AND user_id = $2',
        [taskId, userId]
      );

      if (existing.rows.length === 0) {
        await this.pool.query(
          'INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES ($1, $2, $3)',
          [taskId, userId, userId]
        );

        // Emit real-time update
        if (this.io) {
          this.io.to(`workspace-${workspaceId}`).emit('task-updated', {
            taskId,
            type: 'assignee_added',
            userId
          });
        }

        console.log(`Automation: Assigned user ${userId} to task ${taskId}`);
      }
    } catch (error) {
      console.error('Error assigning user:', error);
    }
  }

  /**
   * Send notification
   */
  async sendNotification(actionData, context) {
    try {
      const userIds = actionData.userIds || [];
      const message = actionData.message || 'Task updated';

      for (const userId of userIds) {
        await this.pool.query(
          `INSERT INTO notifications (user_id, type, message, related_id, related_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, 'automation', message, context.taskId, 'task']
        );

        // Emit real-time notification
        if (this.io) {
          this.io.to(`user-${userId}`).emit('notification', {
            type: 'automation',
            message,
            taskId: context.taskId
          });
        }
      }

      console.log(`Automation: Sent notifications to ${userIds.length} users`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Send reminder
   */
  async sendReminder(taskId, actionData, workspaceId) {
    try {
      // Get task details
      const taskResult = await this.pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );

      if (taskResult.rows.length === 0) return;

      const task = taskResult.rows[0];
      const dueDate = new Date(task.due_date);
      const now = new Date();
      const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);

      // Check if due date is close (within specified hours)
      const reminderHours = actionData.hoursBefore || 24;
      
      if (hoursUntilDue > 0 && hoursUntilDue <= reminderHours) {
        // Get assignees
        const assigneesResult = await this.pool.query(
          'SELECT user_id FROM task_assignees WHERE task_id = $1',
          [taskId]
        );

        const assignees = assigneesResult.rows.map(r => r.user_id);
        
        // If no assignees, notify task creator or workspace members
        if (assignees.length === 0) {
          const membersResult = await this.pool.query(
            'SELECT user_id FROM workspace_members WHERE workspace_id = $1',
            [workspaceId]
          );
          assignees.push(...membersResult.rows.map(r => r.user_id));
        }

        const message = `Reminder: Task "${task.title}" is due ${hoursUntilDue.toFixed(1)} hours from now`;

        for (const userId of assignees) {
          await this.pool.query(
            `INSERT INTO notifications (user_id, type, message, related_id, related_type)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, 'reminder', message, taskId, 'task']
          );

          // Emit real-time notification
          if (this.io) {
            this.io.to(`user-${userId}`).emit('notification', {
              type: 'reminder',
              message,
              taskId
            });
          }
        }

        console.log(`Automation: Sent reminders for task ${taskId}`);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }
}

module.exports = AutomationEngine;

