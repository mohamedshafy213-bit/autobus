import { Router } from 'express';
import svc from '../services/seatingService.js';
import { getSettings } from '../settings.js';
import { dbPath } from '../db.js';
import fs from 'node:fs';

const router = Router();

// Wrapper to handle sync/async errors and format response
const handler = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res, next);
    if (result && typeof result.then === 'function') {
      result.catch(next);
    }
  } catch (err) {
    next(err);
  }
};

// ============================================================
// 1) STATE
// ============================================================
router.get('/state', handler((req, res) => {
  const state = svc.getState();
  res.json(state);
}));

// ============================================================
// 2) SEATING (CONFLICT PREVENTION)
// ============================================================
router.post('/seat', handler((req, res) => {
  const { studentNumber, busNumber } = req.body;
  const result = svc.seatStudent(studentNumber, busNumber);
  res.json(result);
}));

router.post('/unseat', handler((req, res) => {
  const { studentNumber } = req.body;
  const result = svc.unseatStudent(studentNumber);
  res.json(result);
}));

router.post('/move', handler((req, res) => {
  const { studentNumber, busNumber } = req.body;
  const result = svc.moveStudent(studentNumber, busNumber);
  res.json(result);
}));

// ============================================================
// 3) STUDENTS CRUD
// ============================================================
router.post('/students', handler((req, res) => {
  const result = svc.addStudent(req.body);
  res.status(201).json(result);
}));

router.put('/students/:number', handler((req, res) => {
  const result = svc.updateStudent(req.params.number, req.body);
  res.json(result);
}));

router.delete('/students/:number', handler((req, res) => {
  const force = req.query.force === 'true' || req.query.force === '1';
  const result = svc.deleteStudent(req.params.number, force);
  res.json(result);
}));

// ============================================================
// 4) SETTINGS
// ============================================================
router.get('/settings', handler((req, res) => {
  const settings = getSettings();
  res.json(settings);
}));

router.put('/settings', handler((req, res) => {
  const updated = svc.updateSettings(req.body);
  res.json(updated);
}));

// ============================================================
// 5) IMPORT / RESET / BACKUP
// ============================================================
router.post('/import', handler((req, res) => {
  const { students, mode } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ code: 'INVALID_DATA', message: 'صيغة بيانات الاستيراد غير صالحة' });
  }
  const report = svc.importStudents(students, mode || 'skip');
  res.json(report);
}));

router.post('/reset-seating', handler((req, res) => {
  const result = svc.resetSeating();
  res.json(result);
}));

router.get('/export/backup', handler((req, res) => {
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'ملف قاعدة البيانات غير موجود' });
  }
  res.download(dbPath, `buses_backup_${new Date().toISOString().slice(0, 10)}.db`);
}));

// ============================================================
// ERROR HANDLER (Standardized Arabic format)
// ============================================================
router.use((err, req, res, next) => {
  const status = err.status || 400;
  const code = err.code || 'SERVER_ERROR';
  const message = err.message || 'حدث خطأ غير متوقع في الخادم';

  const responseBody = {
    code,
    message
  };

  if (err.busNumber !== undefined) {
    responseBody.busNumber = err.busNumber;
  }
  if (err.reason !== undefined) {
    responseBody.reason = err.reason;
  }

  res.status(status).json(responseBody);
});

export default router;
