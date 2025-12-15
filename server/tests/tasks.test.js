/**
 * Task API Tests
 * Tests for ClickUp-style task management features
 */

const request = require('supertest');
const express = require('express');
const tasksRouter = require('../routes/tasks');

// Mock app setup
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

// Mock database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn()
};

// Mock app.locals
app.locals.pool = mockPool;
app.locals.io = {
  to: jest.fn(() => ({
    emit: jest.fn()
  }))
};

describe('Task API - ClickUp Parity Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tasks - Enhanced Filtering', () => {
    it('should support pagination', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Task 1' }]
      }).mockResolvedValueOnce({
        rows: [{ total: '10' }]
      });

      const response = await request(app)
        .get('/api/tasks')
        .query({ page: 1, perPage: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.perPage).toBe(10);
    });

    it('should support status array filter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      }).mockResolvedValueOnce({
        rows: [{ total: '0' }]
      });

      await request(app)
        .get('/api/tasks')
        .query({ status: ['todo', 'inprogress'] });

      expect(mockPool.query).toHaveBeenCalled();
      const queryCall = mockPool.query.mock.calls[0][0];
      expect(queryCall).toContain('ANY');
    });

    it('should support assignee array filter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      }).mockResolvedValueOnce({
        rows: [{ total: '0' }]
      });

      await request(app)
        .get('/api/tasks')
        .query({ assignedTo: [1, 2] });

      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/tasks/:id - Optimistic Concurrency', () => {
    it('should update task successfully with correct version', async () => {
      const taskId = 1;
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: taskId,
            version: 5,
            updated_at: new Date(),
            title: 'Old Title',
            status: 'todo'
          }]
        })
        .mockResolvedValueOnce({}) // History log
        .mockResolvedValueOnce({
          rows: [{
            id: taskId,
            version: 6,
            title: 'New Title',
            status: 'inprogress'
          }]
        });

      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          title: 'New Title',
          status: 'inprogress',
          version: 5,
          userId: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.version).toBe(6);
    });

    it('should return 409 conflict when version mismatch', async () => {
      const taskId = 1;
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: taskId,
          version: 6, // Current version is 6
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          title: 'New Title',
          version: 5, // Client thinks version is 5
          userId: 1
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('modified by another user');
      expect(response.body.conflict.currentVersion).toBe(6);
      expect(response.body.conflict.providedVersion).toBe(5);
    });

    it('should check updatedAt if version not provided', async () => {
      const taskId = 1;
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-02');

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: taskId,
          version: 1,
          updated_at: newDate // Server has newer date
        }]
      });

      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({
          title: 'New Title',
          updatedAt: oldDate.toISOString(), // Client has older date
          userId: 1
        });

      expect(response.status).toBe(409);
    });
  });

  describe('PATCH /api/tasks/bulk - Bulk Operations', () => {
    it('should update multiple tasks', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [
            { id: 1, title: 'Task 1' },
            { id: 2, title: 'Task 2' }
          ]
        }) // UPDATE
        .mockResolvedValueOnce({}) // History logs (multiple)
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .patch('/api/tasks/bulk')
        .send({
          taskIds: [1, 2],
          updates: { status: 'done' },
          userId: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // UPDATE fails

      const response = await request(app)
        .patch('/api/tasks/bulk')
        .send({
          taskIds: [1, 2],
          updates: { status: 'done' },
          userId: 1
        });

      expect(response.status).toBe(500);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .patch('/api/tasks/bulk')
        .send({
          updates: { status: 'done' }
          // Missing taskIds
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Concurrent Edit Scenario', () => {
    it('should handle concurrent edits correctly', async () => {
      const taskId = 1;
      
      // User 1 gets task (version 5)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: taskId, version: 5, title: 'Original' }]
      });

      // User 2 gets task (version 5)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: taskId, version: 5, title: 'Original' }]
      });

      // User 1 updates (version becomes 6)
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: taskId, version: 6, title: 'Updated by User 1' }]
        })
        .mockResolvedValueOnce({}) // History
        .mockResolvedValueOnce({
          rows: [{ id: taskId, version: 6, title: 'Updated by User 1' }]
        });

      // User 2 tries to update with old version (should fail)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: taskId, version: 6 }] // Current version is now 6
      });

      const user1Response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ title: 'Updated by User 1', version: 5, userId: 1 });

      const user2Response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .send({ title: 'Updated by User 2', version: 5, userId: 2 });

      expect(user1Response.status).toBe(200);
      expect(user2Response.status).toBe(409);
      expect(user2Response.body.conflict.currentVersion).toBe(6);
    });
  });
});

