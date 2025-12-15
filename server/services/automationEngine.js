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
   * @param {string} triggerType - Type of trigger (task_created, status_changed, due_date_passed, recurring)
   * @param {object} context - Context data for the trigger
   */
  async executeAutomations(triggerType, context) {
    try {
      // Build query with optional list/space filtering
      let query = `
        SELECT * FROM automations 
        WHERE trigger_type = $1 
        AND enabled = TRUE
        AND workspace_id = $2
      `;
      const params = [triggerType, context.workspaceId];
      let paramIndex = 3;

      // Filter by list_id if provided
      if (context.listId) {
        query += ` AND (list_id IS NULL OR list_id = $${paramIndex})`;
        params.push(context.listId);
        paramIndex++;
      } else {
        query += ` AND list_id IS NULL`;
      }

      // Filter by space_id if provided
      if (context.spaceId) {
        query += ` AND (space_id IS NULL OR space_id = $${paramIndex})`;
        params.push(context.spaceId);
        paramIndex++;
      } else {
        query += ` AND space_id IS NULL`;
      }

      query += ` ORDER BY created_at ASC`;

      const { rows: automations } = await this.pool.query(query, params);

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
    if (typeof conditions === 'string') {
      try {
        conditions = JSON.parse(conditions);
      } catch (e) {
        conditions = {};
      }
    }
    
    // Check status condition
    if (conditions.status && context.status && context.status !== conditions.status) {
      return false;
    }
    
    // Check list_id condition
    if (conditions.listId && context.listId && context.listId !== conditions.listId) {
      return false;
    }
    
    // Check assignee condition
    if (conditions.assigneeId && context.assigneeId && context.assigneeId !== conditions.assigneeId) {
      return false;
    }
    
    // Check priority condition
    if (conditions.priority && context.priority && context.priority !== conditions.priority) {
      return false;
    }

    return true;
  }

  /**
   * Execute the automation action
   */
  async executeAction(automation, context) {
    const actionType = automation.action_type;
    let actionData = automation.action_data || {};
    
    // Parse action_data if it's a string
    if (typeof actionData === 'string') {
      try {
        actionData = JSON.parse(actionData);
      } catch (e) {
        actionData = {};
      }
    }

    try {
      switch (actionType) {
        case 'assign_user':
          await this.assignUser(context.taskId, actionData.userId, context.workspaceId);
          break;
        
        case 'reassign':
          await this.reassignTask(context.taskId, actionData, context.workspaceId);
          break;
        
        case 'apply_template':
          await this.applyTemplate(context.taskId, actionData, context.workspaceId);
          break;
        
        case 'send_slack':
          await this.sendSlackMessage(context.taskId, actionData, context.workspaceId);
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
      
      // Log automation execution
      await this.logAutomationExecution(automation.id, context.taskId, actionType, true);
    } catch (error) {
      console.error(`Error executing action ${actionType}:`, error);
      await this.logAutomationExecution(automation.id, context.taskId, actionType, false, error.message);
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

  /**
   * Reassign task to a user (or round-robin)
   */
  async reassignTask(taskId, actionData, workspaceId) {
    try {
      let userId = actionData.userId;
      
      // If round-robin, get next user from workspace members
      if (actionData.roundRobin) {
        const membersResult = await this.pool.query(
          'SELECT user_id FROM workspace_members WHERE workspace_id = $1 ORDER BY user_id',
          [workspaceId]
        );
        
        if (membersResult.rows.length === 0) {
          console.log('No workspace members for round-robin assignment');
          return;
        }
        
        // Get current assignees
        const currentAssigneesResult = await this.pool.query(
          'SELECT user_id FROM task_assignees WHERE task_id = $1',
          [taskId]
        );
        const currentAssignees = currentAssigneesResult.rows.map(r => r.user_id);
        
        // Find next user (simple round-robin)
        const members = membersResult.rows.map(r => r.user_id);
        const nextIndex = (members.indexOf(currentAssignees[0] || members[0]) + 1) % members.length;
        userId = members[nextIndex];
      }
      
      if (!userId) {
        console.log('No user specified for reassignment');
        return;
      }
      
      // Remove all current assignees
      await this.pool.query(
        'DELETE FROM task_assignees WHERE task_id = $1',
        [taskId]
      );
      
      // Assign new user
      await this.pool.query(
        'INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES ($1, $2, $3)',
        [taskId, userId, userId]
      );
      
      // Log activity
      await this.pool.query(
        `INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
         VALUES ($1, $2, 'reassigned', 'assignee', NULL, $3)`,
        [taskId, userId, userId.toString()]
      );
      
      // Emit real-time update
      if (this.io) {
        this.io.to(`workspace-${workspaceId}`).emit('task-updated', {
          taskId,
          type: 'reassigned',
          userId
        });
      }
      
      console.log(`Automation: Reassigned task ${taskId} to user ${userId}`);
    } catch (error) {
      console.error('Error reassigning task:', error);
      throw error;
    }
  }

  /**
   * Apply template to task (set fields from template)
   */
  async applyTemplate(taskId, actionData, workspaceId) {
    try {
      const template = actionData.template || actionData; // Support both formats
      const updates = {};
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      // Apply template fields
      if (template.priority) {
        updates.priority = template.priority;
        updateFields.push(`priority = $${paramIndex++}`);
        values.push(template.priority);
      }
      
      if (template.status) {
        updates.status = template.status;
        updateFields.push(`status = $${paramIndex++}`);
        values.push(template.status);
      }
      
      if (template.tags && Array.isArray(template.tags)) {
        updates.tags = template.tags;
        updateFields.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(template.tags));
      }
      
      if (template.customFields) {
        updates.custom_fields = template.customFields;
        updateFields.push(`custom_fields = $${paramIndex++}`);
        values.push(JSON.stringify(template.customFields));
      }
      
      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(taskId);
        
        await this.pool.query(
          `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
        
        // Log activity
        await this.pool.query(
          `INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
           VALUES ($1, $2, 'template_applied', 'template', NULL, $3)`,
          [taskId, null, JSON.stringify(template)]
        );
        
        // Emit real-time update
        if (this.io) {
          this.io.to(`workspace-${workspaceId}`).emit('task-updated', {
            taskId,
            type: 'template_applied',
            updates
          });
        }
        
        console.log(`Automation: Applied template to task ${taskId}`);
      }
      
      // Assign users if specified in template
      if (template.assignees && Array.isArray(template.assignees)) {
        for (const userId of template.assignees) {
          await this.assignUser(taskId, userId, workspaceId);
        }
      }
    } catch (error) {
      console.error('Error applying template:', error);
      throw error;
    }
  }

  /**
   * Send Slack message (integration)
   */
  async sendSlackMessage(taskId, actionData, workspaceId) {
    try {
      // Get task details
      const taskResult = await this.pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      
      if (taskResult.rows.length === 0) {
        console.log(`Task ${taskId} not found for Slack message`);
        return;
      }
      
      const task = taskResult.rows[0];
      const channel = actionData.channel || '#general';
      const message = actionData.message || `Task "${task.title}" has been updated`;
      
      // Build Slack message
      const slackMessage = {
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${task.title}*\n${task.description || 'No description'}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Status: ${task.status} | Priority: ${task.priority || 'medium'}`
              }
            ]
          }
        ]
      };
      
      // In a real implementation, you would call Slack API here
      // For now, we'll log it and potentially store it for later processing
      console.log(`Automation: Slack message to ${channel}:`, slackMessage);
      
      // Store integration event (if you have an integrations table)
      try {
        await this.pool.query(
          `INSERT INTO notifications (user_id, type, message, related_id, related_type)
           VALUES ($1, 'slack_sent', $2, $3, 'task')`,
          [null, `Slack message sent to ${channel}`, taskId]
        );
      } catch (err) {
        // Ignore if notifications table doesn't support this
      }
      
      // Emit real-time update
      if (this.io) {
        this.io.to(`workspace-${workspaceId}`).emit('integration-event', {
          type: 'slack',
          channel,
          message: slackMessage,
          taskId
        });
      }
    } catch (error) {
      console.error('Error sending Slack message:', error);
      throw error;
    }
  }

  /**
   * Log automation execution
   */
  async logAutomationExecution(automationId, taskId, actionType, success, errorMessage = null) {
    try {
      // You could create an automation_logs table, or use task_history
      await this.pool.query(
        `INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
         VALUES ($1, $2, $3, 'automation', $4, $5)`,
        [
          taskId,
          null,
          success ? 'automation_executed' : 'automation_failed',
          automationId?.toString() || null,
          JSON.stringify({ actionType, success, errorMessage })
        ]
      );
    } catch (err) {
      // Ignore logging errors
      console.log('Could not log automation execution:', err.message);
    }
  }

  /**
   * Check and execute recurring automations
   */
  async checkRecurringAutomations() {
    try {
      const now = new Date();
      
      // Get all recurring automations that are due
      const { rows: automations } = await this.pool.query(
        `SELECT * FROM automations 
         WHERE schedule_type IS NOT NULL 
         AND enabled = TRUE
         AND (next_run_at IS NULL OR next_run_at <= $1)
         ORDER BY next_run_at ASC`,
        [now]
      );
      
      for (const automation of automations) {
        try {
          // Execute the automation with a recurring context
          const context = {
            workspaceId: automation.workspace_id,
            listId: automation.list_id,
            spaceId: automation.space_id,
            triggerType: 'recurring',
            automationId: automation.id
          };
          
          await this.executeAction(automation, context);
          
          // Calculate next run time
          const nextRun = this.calculateNextRun(automation.schedule_type, automation.schedule_config);
          
          // Update last_run_at and next_run_at
          await this.pool.query(
            `UPDATE automations 
             SET last_run_at = CURRENT_TIMESTAMP, 
                 next_run_at = $1 
             WHERE id = $2`,
            [nextRun, automation.id]
          );
        } catch (error) {
          console.error(`Error executing recurring automation ${automation.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking recurring automations:', error);
    }
  }

  /**
   * Calculate next run time for recurring automation
   */
  calculateNextRun(scheduleType, scheduleConfig) {
    const now = new Date();
    let config = scheduleConfig || {};
    
    // Parse config if it's a string
    if (typeof config === 'string') {
      try {
        config = JSON.parse(config);
      } catch (e) {
        config = {};
      }
    }
    
    const time = config.time || '09:00';
    const [hours, minutes] = time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    switch (scheduleType) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
        
      case 'weekly':
        const dayOfWeek = config.dayOfWeek !== undefined ? parseInt(config.dayOfWeek) : 1; // Monday = 1
        const currentDay = nextRun.getDay();
        let daysToAdd = (dayOfWeek - currentDay + 7) % 7;
        if (daysToAdd === 0 && nextRun <= now) {
          daysToAdd = 7;
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd);
        break;
        
      case 'monthly':
        const dayOfMonth = config.dayOfMonth !== undefined ? parseInt(config.dayOfMonth) : 1;
        nextRun.setDate(dayOfMonth);
        if (nextRun <= now || nextRun.getDate() !== dayOfMonth) {
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(dayOfMonth);
        }
        break;
        
      default:
        // Default to daily
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
    }
    
    return nextRun;
  }
}

module.exports = AutomationEngine;

