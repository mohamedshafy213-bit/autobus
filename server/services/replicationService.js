import { getSettings, saveSettings } from '../settings.js';
import seatingService from './seatingService.js';

let lastSyncTime = null;
let lastSyncStatus = 'idle'; // 'idle' | 'success' | 'error'
let lastSyncError = null;
let isReplicating = false;

/**
 * Push full replication snapshot to configured Backup Server
 */
export async function pushToBackupServer(targetUrl = null) {
  const settings = getSettings();
  const backupUrl = (targetUrl || settings.backupServerUrl || '').trim().replace(/\/$/, '');

  if (!backupUrl) {
    return { skipped: true, reason: 'NO_BACKUP_URL' };
  }

  if (isReplicating) {
    return { skipped: true, reason: 'ALREADY_REPLICATING' };
  }

  isReplicating = true;
  try {
    const snapshot = seatingService.getReplicationSnapshot();
    const endpoint = `${backupUrl}/api/replication/apply`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(snapshot),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Backup server returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    lastSyncTime = new Date().toISOString();
    lastSyncStatus = 'success';
    lastSyncError = null;

    return {
      success: true,
      backupUrl,
      timestamp: lastSyncTime,
      data
    };
  } catch (err) {
    lastSyncStatus = 'error';
    lastSyncError = err.message || 'فشلت المزامنة مع السيرفر الاحتياطي';
    console.warn(`[Replication Warning] Failed to sync to ${backupUrl}:`, err.message);
    return {
      success: false,
      backupUrl,
      error: lastSyncError
    };
  } finally {
    isReplicating = false;
  }
}

/**
 * Pull full replication snapshot from a remote Primary Server and apply locally
 */
export async function pullFromPrimaryServer(primaryUrl) {
  const cleanUrl = String(primaryUrl || '').trim().replace(/\/$/, '');
  if (!cleanUrl) {
    throw new Error('رابط السيرفر الرئيسي غير محدد');
  }

  const endpoint = `${cleanUrl}/api/replication/snapshot`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`تعذر استلام البيانات من السيرفر الرئيسي (${response.status})`);
  }

  const snapshot = await response.json();
  const result = seatingService.applyReplicationSnapshot(snapshot);

  lastSyncTime = new Date().toISOString();
  lastSyncStatus = 'success';
  lastSyncError = null;

  return {
    success: true,
    primaryUrl: cleanUrl,
    result,
    timestamp: lastSyncTime
  };
}

/**
 * Non-blocking fire-and-forget sync triggered after mutations
 */
export function queueAutoReplication() {
  const settings = getSettings();
  if (settings.autoReplicate && settings.backupServerUrl) {
    // Run asynchronously without blocking HTTP response
    setImmediate(() => {
      pushToBackupServer().catch(err => {
        console.warn('[AutoReplication Error]:', err.message);
      });
    });
  }
}

/**
 * Current replication health status
 */
export function getReplicationStatus() {
  const settings = getSettings();
  return {
    backupServerUrl: settings.backupServerUrl || '',
    autoReplicate: settings.autoReplicate,
    lastSyncTime,
    lastSyncStatus,
    lastSyncError,
    isReplicating
  };
}

export default {
  pushToBackupServer,
  pullFromPrimaryServer,
  queueAutoReplication,
  getReplicationStatus
};
