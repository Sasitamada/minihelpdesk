const integrationMessages = {
  google_calendar: {
    name: 'Google Calendar',
    connect: 'Connected to Google Calendar. Tasks will stay in sync with events.',
    sync: 'Synced tasks with Google Calendar.',
  },
  slack: {
    name: 'Slack',
    connect: 'Slack workspace connected. Task updates will be posted to the selected channel.',
    sync: 'Posted latest task updates to Slack channel.',
  },
  github: {
    name: 'GitHub',
    connect: 'GitHub repository connected. You can now create issues from tasks.',
    sync: 'Created/updated GitHub issues based on tasks.',
  },
  zapier: {
    name: 'Zapier',
    connect: 'Zapier webhook configured. Automations can trigger Zaps.',
    sync: 'Triggered Zapier webhook for latest tasks.',
  },
  drive: {
    name: 'Drive/Dropbox',
    connect: 'Cloud storage linked. You can attach Drive/Dropbox files to tasks.',
    sync: 'Indexed Drive/Dropbox files for quick attachment.',
  },
};

async function simulateDelay() {
  return new Promise((resolve) => setTimeout(resolve, 400));
}

async function simulateConnect(type, settings = {}) {
  await simulateDelay();
  const meta = integrationMessages[type] || {};
  return {
    message: meta.connect || 'Integration connected.',
    settings,
  };
}

async function simulateSync(type) {
  await simulateDelay();
  const meta = integrationMessages[type] || {};
  return {
    message: meta.sync || 'Integration sync completed.',
    syncedAt: new Date(),
  };
}

module.exports = {
  simulateConnect,
  simulateSync,
  integrationMessages,
};

