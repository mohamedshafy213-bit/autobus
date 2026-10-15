/**
 * API client with Automatic Failover (Primary <-> Backup Server)
 */

const failoverListeners = new Set();

// Parse initial parameters from URL or localStorage
let primaryServerUrl = localStorage.getItem('autobus_primary_server') || '';
let backupServerUrl = localStorage.getItem('autobus_backup_server') || '';
let activeServer = localStorage.getItem('autobus_active_server') || 'primary'; // 'primary' | 'backup'

// Auto-detect backup from URL query params (e.g. ?backup=http://192.168.20.101:3000)
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const qBackup = params.get('backup');
    if (qBackup) {
      backupServerUrl = qBackup.replace(/\/$/, '');
      localStorage.setItem('autobus_backup_server', backupServerUrl);
    }
  } catch (e) {
    // ignore
  }
}

export function onFailover(listener) {
  failoverListeners.add(listener);
  return () => failoverListeners.delete(listener);
}

function notifyFailover(event) {
  for (const listener of failoverListeners) {
    try {
      listener(event);
    } catch (e) {
      console.error('Error in failover listener:', e);
    }
  }
}

export function getServerConfig() {
  return {
    primaryServerUrl,
    backupServerUrl,
    activeServer
  };
}

export function setServerConfig({ primaryUrl, backupUrl, active }) {
  if (primaryUrl !== undefined) {
    primaryServerUrl = (primaryUrl || '').trim().replace(/\/$/, '');
    localStorage.setItem('autobus_primary_server', primaryServerUrl);
  }
  if (backupUrl !== undefined) {
    backupServerUrl = (backupUrl || '').trim().replace(/\/$/, '');
    localStorage.setItem('autobus_backup_server', backupServerUrl);
  }
  if (active !== undefined && (active === 'primary' || active === 'backup')) {
    activeServer = active;
    localStorage.setItem('autobus_active_server', activeServer);
  }
  return getServerConfig();
}

export function getActiveServerUrl() {
  if (activeServer === 'backup' && backupServerUrl) {
    return backupServerUrl;
  }
  return primaryServerUrl; // empty string means current origin
}

function isNetworkError(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.name === 'AbortError' ||
    err.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('connection refused') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}

async function executeFetch(baseUrl, path, options) {
  const cleanBase = (baseUrl || '').replace(/\/$/, '');
  const url = cleanBase ? `${cleanBase}${path}` : path;

  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const controller = new AbortController();
  // 5 seconds timeout for ordinary requests
  const timeoutMs = options.timeoutMs || 5000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      },
      signal: options.signal || controller.signal
    });
    clearTimeout(timer);

    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error((data && data.message) || `خطأ في الخادم (${response.status})`);
      error.status = response.status;
      error.code = (data && data.code) || 'REQUEST_FAILED';
      if (data && typeof data === 'object') {
        Object.assign(error, data);
      }
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function request(path, options = {}) {
  const currentTarget = activeServer;
  const currentBase = getActiveServerUrl();

  try {
    return await executeFetch(currentBase, path, options);
  } catch (err) {
    // Check if network error and failover is possible
    const canFailoverToBackup = (currentTarget === 'primary' && backupServerUrl && isNetworkError(err));
    const canFailoverToPrimary = (currentTarget === 'backup' && isNetworkError(err));

    if (canFailoverToBackup) {
      console.warn(`[Failover] Primary server unavailable (${err.message}). Switching to Backup: ${backupServerUrl}`);
      activeServer = 'backup';
      localStorage.setItem('autobus_active_server', 'backup');

      notifyFailover({
        switchedTo: 'backup',
        url: backupServerUrl,
        reason: err.message
      });

      // Retry request on backup server immediately
      return await executeFetch(backupServerUrl, path, options);
    } else if (canFailoverToPrimary && primaryServerUrl) {
      console.warn(`[Failover] Backup server unavailable (${err.message}). Switching to Primary: ${primaryServerUrl}`);
      activeServer = 'primary';
      localStorage.setItem('autobus_active_server', 'primary');

      notifyFailover({
        switchedTo: 'primary',
        url: primaryServerUrl,
        reason: err.message
      });

      return await executeFetch(primaryServerUrl, path, options);
    }

    throw err;
  }
}

// Ping specific server to check its health
export async function apiPingServer(targetUrl) {
  try {
    const res = await executeFetch(targetUrl, '/api/info', { timeoutMs: 2500 });
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchState() {
  return request('/api/state');
}

export async function apiSeat(studentNumber, busNumber, attendedMemberIds) {
  return request('/api/seat', {
    method: 'POST',
    body: JSON.stringify({ studentNumber, busNumber, attendedMemberIds })
  });
}

export async function apiAutoSeat(studentNumber, attendedMemberIds) {
  return request('/api/auto-seat', {
    method: 'POST',
    body: JSON.stringify({ studentNumber, attendedMemberIds })
  });
}

export async function apiUnseat(studentNumber) {
  return request('/api/unseat', {
    method: 'POST',
    body: JSON.stringify({ studentNumber })
  });
}

export async function apiMove(studentNumber, busNumber, attendedMemberIds) {
  return request('/api/move', {
    method: 'POST',
    body: JSON.stringify({ studentNumber, busNumber, attendedMemberIds })
  });
}

export async function apiAddStudent(studentData) {
  return request('/api/students', {
    method: 'POST',
    body: JSON.stringify(studentData)
  });
}

export async function apiUpdateStudent(militaryNumber, studentData) {
  return request(`/api/students/${encodeURIComponent(militaryNumber)}`, {
    method: 'PUT',
    body: JSON.stringify(studentData)
  });
}

export async function apiDeleteStudent(militaryNumber, force = false) {
  const q = force ? '?force=true' : '';
  return request(`/api/students/${encodeURIComponent(militaryNumber)}${q}`, {
    method: 'DELETE'
  });
}

export async function apiDeleteAllStudents() {
  try {
    return await request('/api/students', { method: 'DELETE' });
  } catch (err) {
    if (err.status === 404) {
      return await request('/api/students/delete-all', { method: 'POST' });
    }
    throw err;
  }
}

export async function apiGetSettings() {
  return request('/api/settings');
}

export async function apiUpdateSettings(settings) {
  return request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}

export async function apiImportStudents(students, mode = 'skip') {
  return request('/api/import', {
    method: 'POST',
    body: JSON.stringify({ students, mode })
  });
}

export async function apiResetSeating() {
  return request('/api/reset-seating', {
    method: 'POST'
  });
}

export async function apiGetDeviceInfo() {
  return request('/api/info');
}

export async function apiGetReplicationStatus() {
  return request('/api/replication/status');
}

export async function apiTriggerSyncNow(backupUrl) {
  return request('/api/replication/sync-now', {
    method: 'POST',
    body: JSON.stringify({ backupUrl })
  });
}

export async function apiTriggerPullNow(primaryUrl) {
  return request('/api/replication/pull-now', {
    method: 'POST',
    body: JSON.stringify({ primaryUrl })
  });
}

export default {
  fetchState,
  apiSeat,
  apiAutoSeat,
  apiUnseat,
  apiMove,
  apiAddStudent,
  apiUpdateStudent,
  apiDeleteStudent,
  apiDeleteAllStudents,
  apiGetSettings,
  apiUpdateSettings,
  apiImportStudents,
  apiResetSeating,
  apiGetDeviceInfo,
  apiGetReplicationStatus,
  apiTriggerSyncNow,
  apiTriggerPullNow,
  apiPingServer,
  getServerConfig,
  setServerConfig,
  getActiveServerUrl,
  onFailover
};
