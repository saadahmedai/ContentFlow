import { Settings } from '../types';
import { DEFAULT_CHANNELS } from '../constants';

const SETTINGS_KEY = 'cf_settings';

export const getInitialSettings = (): Settings => {
  const stored = localStorage.getItem(SETTINGS_KEY);
  const defaultSettings: Settings = {
    sheetsUrl: '',
    lastSync: 0,
    ntfyTopic: `cf_${Math.random().toString(36).substring(2, 6)}`,
    vapidKey: 'BM4WeyX43BkPmC1qV2Q1xe2M2Edsy-dmCP78INrgYYkThBsa7nwAXXj0nfSqmi3uQdJgi1413gWuhOWNvqUm27o',
    notificationsEnabled: true,
    notifications: {
      newIdea: true,
      stageChange: true,
      deadlineApproaching: true,
      dailyReminders: true,
      lowIdeas: true,
    },
    channels: DEFAULT_CHANNELS,
  };
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    } catch (e) {
      return defaultSettings;
    }
  }
  return defaultSettings;
};

export const saveLocalSettings = (settings: Settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const sendNotification = async (topic: string, title: string, body: string) => {
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: body,
      headers: {
        'Title': title,
        'Priority': 'high',
      },
    });
  } catch (error) {
    console.error('Notification failed:', error);
  }
};
