/**
 * API client for communicating with the LAN Express server
 */

function getBaseUrl() {
  // If running via Vite dev server proxying to port 3000, or in production served from Express
  return '';
}

async function request(path, options = {}) {
  const url = `${getBaseUrl()}${path}`;
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {})
    }
  });

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
}

export async function fetchState() {
  return request('/api/state');
}

export async function apiSeat(studentNumber, busNumber) {
  return request('/api/seat', {
    method: 'POST',
    body: JSON.stringify({ studentNumber, busNumber })
  });
}

export async function apiUnseat(studentNumber) {
  return request('/api/unseat', {
    method: 'POST',
    body: JSON.stringify({ studentNumber })
  });
}

export async function apiMove(studentNumber, busNumber) {
  return request('/api/move', {
    method: 'POST',
    body: JSON.stringify({ studentNumber, busNumber })
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

export default {
  fetchState,
  apiSeat,
  apiUnseat,
  apiMove,
  apiAddStudent,
  apiUpdateStudent,
  apiDeleteStudent,
  apiGetSettings,
  apiUpdateSettings,
  apiImportStudents,
  apiResetSeating
};
