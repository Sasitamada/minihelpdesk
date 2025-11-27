const express = require('express');
const router = express.Router();
const integrationClients = require('../services/integrationClients');

// List integrations for a workspace
router.get('/workspace/:workspaceId', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT * FROM integrations WHERE workspace_id = $1 ORDER BY type ASC`,
      [req.params.workspaceId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ message: error.message });
  }
});

// Fetch integration logs
router.get('/:integrationId/logs', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT * FROM integration_logs WHERE integration_id = $1 ORDER BY created_at DESC LIMIT 25`,
      [req.params.integrationId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching integration logs:', error);
    res.status(500).json({ message: error.message });
  }
});

// Connect or update integration
router.post('/connect', async (req, res) => {
  try {
    const { workspaceId, type, settings = {}, createdBy } = req.body;
    if (!workspaceId || !type) {
      return res.status(400).json({ message: 'Workspace ID and integration type are required' });
    }

    const clientResult = await integrationClients.simulateConnect(type, settings);

    const existing = await req.app.locals.pool.query(
      'SELECT * FROM integrations WHERE workspace_id = $1 AND type = $2',
      [workspaceId, type]
    );

    let integration;
    if (existing.rows.length) {
      const updateResult = await req.app.locals.pool.query(
        `UPDATE integrations
         SET status = 'connected',
             settings = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(settings), existing.rows[0].id]
      );
      integration = updateResult.rows[0];
    } else {
      const insertResult = await req.app.locals.pool.query(
        `INSERT INTO integrations (workspace_id, type, status, settings, created_by)
         VALUES ($1, $2, 'connected', $3, $4)
         RETURNING *`,
        [workspaceId, type, JSON.stringify(settings), createdBy || null]
      );
      integration = insertResult.rows[0];
    }

    await req.app.locals.pool.query(
      `INSERT INTO integration_logs (integration_id, message, metadata)
       VALUES ($1, $2, $3)`,
      [integration.id, clientResult.message, JSON.stringify(settings)]
    );

    res.json(integration);
  } catch (error) {
    console.error('Error connecting integration:', error);
    res.status(500).json({ message: error.message });
  }
});

// Disconnect integration
router.post('/disconnect', async (req, res) => {
  try {
    const { workspaceId, type } = req.body;
    if (!workspaceId || !type) {
      return res.status(400).json({ message: 'Workspace ID and integration type are required' });
    }

    const { rows } = await req.app.locals.pool.query(
      `UPDATE integrations
       SET status = 'disconnected',
           updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1 AND type = $2
       RETURNING *`,
      [workspaceId, type]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    await req.app.locals.pool.query(
      `INSERT INTO integration_logs (integration_id, message, level)
       VALUES ($1, $2, 'warning')`,
      [rows[0].id, 'Integration disconnected by user']
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ message: error.message });
  }
});

// Trigger manual sync
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const integrationResult = await req.app.locals.pool.query(
      'SELECT * FROM integrations WHERE id = $1',
      [id]
    );
    if (!integrationResult.rows.length) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    const integration = integrationResult.rows[0];
    if (integration.status !== 'connected') {
      return res.status(400).json({ message: 'Integration must be connected before syncing' });
    }

    const syncResult = await integrationClients.simulateSync(integration.type);

    await req.app.locals.pool.query(
      `UPDATE integrations
       SET last_synced_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    await req.app.locals.pool.query(
      `INSERT INTO integration_logs (integration_id, message, metadata)
       VALUES ($1, $2, $3)`,
      [id, syncResult.message, JSON.stringify({ syncedAt: syncResult.syncedAt })]
    );

    res.json({ message: syncResult.message, syncedAt: syncResult.syncedAt });
  } catch (error) {
    console.error('Error syncing integration:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

