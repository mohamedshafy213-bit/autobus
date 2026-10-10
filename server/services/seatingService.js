import { db } from '../db.js';
import { getSettings, saveSettings, getBusLimits } from '../settings.js';

// ============================================================
// HELPER PREPARED STATEMENTS
// ============================================================
const stmts = {
  getStudent: db.prepare('SELECT * FROM students WHERE military_number = ?'),
  getAllStudents: db.prepare('SELECT * FROM students ORDER BY name ASC'),
  insertStudent: db.prepare('INSERT INTO students (military_number, name) VALUES (?, ?)'),
  updateStudent: db.prepare('UPDATE students SET name = ? WHERE military_number = ?'),
  deleteStudent: db.prepare('DELETE FROM students WHERE military_number = ?'),

  getFamiliesByStudent: db.prepare('SELECT * FROM families WHERE student_number = ? ORDER BY id ASC'),
  getAllFamilies: db.prepare('SELECT * FROM families ORDER BY student_number, id ASC'),
  countFamiliesByStudent: db.prepare('SELECT COUNT(*) as cnt FROM families WHERE student_number = ?'),
  insertFamily: db.prepare('INSERT INTO families (student_number, name, national_id, relation) VALUES (?, ?, ?, ?)'),
  deleteFamiliesByStudent: db.prepare('DELETE FROM families WHERE student_number = ?'),

  getBusSeatByStudent: db.prepare('SELECT * FROM buses WHERE student_number = ?'),
  getAllBusSeats: db.prepare('SELECT * FROM buses ORDER BY bus_number, seated_at ASC'),
  countFamiliesInBus: db.prepare('SELECT COUNT(*) as cnt FROM buses WHERE bus_number = ?'),
  countMembersInBus: db.prepare(`
    SELECT COUNT(*) as cnt 
    FROM families 
    WHERE student_number IN (SELECT student_number FROM buses WHERE bus_number = ?)
  `),
  insertBusSeat: db.prepare('INSERT INTO buses (bus_number, student_number, seated_at) VALUES (?, ?, ?)'),
  updateBusSeat: db.prepare('UPDATE buses SET bus_number = ?, seated_at = ? WHERE student_number = ?'),
  deleteBusSeat: db.prepare('DELETE FROM buses WHERE student_number = ?'),
  deleteAllBusSeats: db.prepare('DELETE FROM buses'),
  getMaxSeatedBus: db.prepare('SELECT MAX(bus_number) as maxBus FROM buses')
};

/**
 * Get current capacity counts for a bus inside a transaction
 */
function getBusCountsInsideTx(busNumber) {
  const familiesCount = stmts.countFamiliesInBus.get(busNumber)?.cnt || 0;
  const membersCount = stmts.countMembersInBus.get(busNumber)?.cnt || 0;
  // Total persons = 1 student per family + total family members
  const personsCount = familiesCount + membersCount;
  return { familiesCount, personsCount };
}

/**
 * Get total persons count for a specific student family (1 student + members)
 */
function getStudentPersonsCount(studentNumber) {
  const members = stmts.countFamiliesByStudent.get(studentNumber)?.cnt || 0;
  return 1 + members;
}

// ============================================================
// STATE SNAPSHOT
// ============================================================
export function getState() {
  const settings = getSettings();
  const allStudents = stmts.getAllStudents.all();
  const allFamilies = stmts.getAllFamilies.all();
  const allSeats = stmts.getAllBusSeats.all();

  // Index families by student_number
  const familiesByStudent = new Map();
  for (const f of allFamilies) {
    if (!familiesByStudent.has(f.student_number)) {
      familiesByStudent.set(f.student_number, []);
    }
    familiesByStudent.get(f.student_number).push({
      id: f.id,
      student_number: f.student_number,
      name: f.name,
      national_id: f.national_id || '',
      relation: f.relation || ''
    });
  }

  // Index seating by student_number
  const seatByStudent = new Map();
  for (const s of allSeats) {
    seatByStudent.set(s.student_number, s);
  }

  // Format students array
  const students = allStudents.map(student => {
    const mems = familiesByStudent.get(student.military_number) || [];
    const seat = seatByStudent.get(student.military_number);
    return {
      military_number: student.military_number,
      name: student.name,
      families: mems,
      bus_number: seat ? seat.bus_number : null,
      seated_at: seat ? seat.seated_at : null,
      persons_count: 1 + mems.length
    };
  });

  // Calculate bus stats (buses 1..busCount)
  const busMap = new Map();
  for (let i = 1; i <= settings.busCount; i++) {
    const limits = getBusLimits(i, settings);
    busMap.set(i, {
      number: i,
      maxFamilies: limits.maxFamilies,
      maxPersons: limits.maxPersons,
      familiesCount: 0,
      personsCount: 0
    });
  }

  // Aggregate counts per bus
  for (const s of students) {
    if (s.bus_number && busMap.has(s.bus_number)) {
      const b = busMap.get(s.bus_number);
      b.familiesCount += 1;
      b.personsCount += s.persons_count;
    }
  }

  const buses = Array.from(busMap.values());

  return {
    students,
    buses,
    settings
  };
}

// ============================================================
// CONFLICT PREVENTION: SEAT, UNSEAT, MOVE (TRANSACTIONAL)
// ============================================================

/**
 * Seat a student's family in a bus with conflict prevention
 */
export const seatStudent = db.transaction((studentNumber, busNumber) => {
  const stdNum = String(studentNumber || '').trim();
  const busNum = Number(busNumber);

  // 1. Student exists?
  const student = stmts.getStudent.get(stdNum);
  if (!student) {
    const err = new Error('الطالب غير مسجل بالمنظومة');
    err.code = 'STUDENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // 2. Student already seated?
  const existingSeat = stmts.getBusSeatByStudent.get(stdNum);
  if (existingSeat) {
    const err = new Error(`هذه العائلة سُجّلت بالفعل في أتوبيس رقم ${existingSeat.bus_number}`);
    err.code = 'ALREADY_SEATED';
    err.status = 409;
    err.busNumber = existingSeat.bus_number;
    throw err;
  }

  // 3. Bus number valid?
  const settings = getSettings();
  if (!busNum || busNum < 1 || busNum > settings.busCount) {
    const err = new Error('رقم الأتوبيس غير صالح');
    err.code = 'INVALID_BUS_NUMBER';
    err.status = 400;
    throw err;
  }

  // 4. Capacity validation inside transaction
  const limits = getBusLimits(busNum, settings);
  const currentCounts = getBusCountsInsideTx(busNum);
  const thisFamilyPersons = getStudentPersonsCount(stdNum);

  if (currentCounts.familiesCount + 1 > limits.maxFamilies) {
    const err = new Error(`الأتوبيس رقم ${busNum} لم يعد يتسع (اكتمل عدد العائلات)، اختر أتوبيساً آخر`);
    err.code = 'BUS_FULL';
    err.status = 409;
    err.busNumber = busNum;
    err.reason = 'FAMILIES';
    throw err;
  }

  if (currentCounts.personsCount + thisFamilyPersons > limits.maxPersons) {
    const err = new Error(`الأتوبيس رقم ${busNum} لم يعد يتسع لعدد أفراد هذه العائلة (${thisFamilyPersons} فرد)، اختر أتوبيساً آخر`);
    err.code = 'BUS_FULL';
    err.status = 409;
    err.busNumber = busNum;
    err.reason = 'PERSONS';
    throw err;
  }

  // 5. Insert seat
  const seatedAt = new Date().toISOString();
  stmts.insertBusSeat.run(busNum, stdNum, seatedAt);

  return {
    success: true,
    studentNumber: stdNum,
    busNumber: busNum,
    seated_at: seatedAt
  };
}).immediate;

/**
 * Unseat a student (cancel arrival)
 */
export const unseatStudent = db.transaction((studentNumber) => {
  const stdNum = String(studentNumber || '').trim();
  const existing = stmts.getBusSeatByStudent.get(stdNum);
  if (!existing) {
    const err = new Error('العائلة غير مسجلة في أي أتوبيس');
    err.code = 'NOT_SEATED';
    err.status = 404;
    throw err;
  }

  stmts.deleteBusSeat.run(stdNum);
  return { success: true, studentNumber: stdNum };
}).immediate;

/**
 * Move a student to another bus with capacity validation
 */
export const moveStudent = db.transaction((studentNumber, targetBusNumber) => {
  const stdNum = String(studentNumber || '').trim();
  const targetBus = Number(targetBusNumber);

  const student = stmts.getStudent.get(stdNum);
  if (!student) {
    const err = new Error('الطالب غير مسجل');
    err.code = 'STUDENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const existingSeat = stmts.getBusSeatByStudent.get(stdNum);
  if (!existingSeat) {
    const err = new Error('العائلة لم تسجل حضورها بعد');
    err.code = 'NOT_SEATED';
    err.status = 400;
    throw err;
  }

  const settings = getSettings();
  if (!targetBus || targetBus < 1 || targetBus > settings.busCount) {
    const err = new Error('رقم الأتوبيس غير صالح');
    err.code = 'INVALID_BUS_NUMBER';
    err.status = 400;
    throw err;
  }

  // If already in target bus, no-op
  if (existingSeat.bus_number === targetBus) {
    return { success: true, busNumber: targetBus, studentNumber: stdNum };
  }

  // Check capacity of target bus
  const limits = getBusLimits(targetBus, settings);
  const currentCounts = getBusCountsInsideTx(targetBus);
  const thisFamilyPersons = getStudentPersonsCount(stdNum);

  if (currentCounts.familiesCount + 1 > limits.maxFamilies) {
    const err = new Error(`الأتوبيس رقم ${targetBus} لم يعد يتسع (اكتمل عدد العائلات)، اختر أتوبيساً آخر`);
    err.code = 'BUS_FULL';
    err.status = 409;
    err.busNumber = targetBus;
    err.reason = 'FAMILIES';
    throw err;
  }

  if (currentCounts.personsCount + thisFamilyPersons > limits.maxPersons) {
    const err = new Error(`الأتوبيس رقم ${targetBus} لم يعد يتسع لعدد أفراد هذه العائلة (${thisFamilyPersons} فرد)، اختر أتوبيساً آخر`);
    err.code = 'BUS_FULL';
    err.status = 409;
    err.busNumber = targetBus;
    err.reason = 'PERSONS';
    throw err;
  }

  const seatedAt = new Date().toISOString();
  stmts.updateBusSeat.run(targetBus, seatedAt, stdNum);

  return {
    success: true,
    studentNumber: stdNum,
    busNumber: targetBus,
    seated_at: seatedAt
  };
}).immediate;

// ============================================================
// STUDENT CRUD (TRANSACTIONAL)
// ============================================================

export const addStudent = db.transaction(({ military_number, name, families = [] }) => {
  const stdNum = String(military_number || '').trim();
  const stdName = String(name || '').trim();

  if (!stdNum || !stdName) {
    const err = new Error('يرجى إدخال الرقم العسكري واسم الطالب');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }

  const exists = stmts.getStudent.get(stdNum);
  if (exists) {
    const err = new Error(`الرقم العسكري (${stdNum}) مسجل مسبقاً`);
    err.code = 'DUPLICATE_STUDENT';
    err.status = 409;
    throw err;
  }

  stmts.insertStudent.run(stdNum, stdName);

  for (const m of families) {
    const memName = String(m.name || '').trim();
    if (memName) {
      const natId = String(m.national_id || '').trim();
      const rel = String(m.relation || '').trim();
      stmts.insertFamily.run(stdNum, memName, natId, rel);
    }
  }

  return { success: true, military_number: stdNum, name: stdName };
}).immediate;

export const updateStudent = db.transaction((militaryNumber, { name, families = [] }) => {
  const stdNum = String(militaryNumber || '').trim();
  const stdName = String(name || '').trim();

  if (!stdName) {
    const err = new Error('اسم الطالب مطلوب');
    err.code = 'VALIDATION_ERROR';
    err.status = 400;
    throw err;
  }

  const student = stmts.getStudent.get(stdNum);
  if (!student) {
    const err = new Error('الطالب غير مسجل');
    err.code = 'STUDENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // If student is seated, check if persons increase violates bus limits
  const seated = stmts.getBusSeatByStudent.get(stdNum);
  if (seated) {
    const oldFamilyCount = stmts.countFamiliesByStudent.get(stdNum)?.cnt || 0;
    const oldPersons = 1 + oldFamilyCount;
    const newPersons = 1 + families.filter(f => String(f.name || '').trim()).length;

    if (newPersons > oldPersons) {
      const settings = getSettings();
      const limits = getBusLimits(seated.bus_number, settings);
      const currentCounts = getBusCountsInsideTx(seated.bus_number);
      const netPersons = currentCounts.personsCount - oldPersons + newPersons;

      if (netPersons > limits.maxPersons) {
        const err = new Error(`زيادة أفراد الأسرة تتجاوز السعة القصوى للأتوبيس رقم ${seated.bus_number}`);
        err.code = 'BUS_FULL';
        err.status = 409;
        err.busNumber = seated.bus_number;
        err.reason = 'PERSONS';
        throw err;
      }
    }
  }

  // Update student name
  stmts.updateStudent.run(stdName, stdNum);

  // Replace families
  stmts.deleteFamiliesByStudent.run(stdNum);
  for (const m of families) {
    const memName = String(m.name || '').trim();
    if (memName) {
      const natId = String(m.national_id || '').trim();
      const rel = String(m.relation || '').trim();
      stmts.insertFamily.run(stdNum, memName, natId, rel);
    }
  }

  return { success: true, military_number: stdNum, name: stdName };
}).immediate;

export const deleteStudent = db.transaction((militaryNumber, force = false) => {
  const stdNum = String(militaryNumber || '').trim();
  const student = stmts.getStudent.get(stdNum);
  if (!student) {
    const err = new Error('الطالب غير مسجل');
    err.code = 'STUDENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const seated = stmts.getBusSeatByStudent.get(stdNum);
  if (seated && !force) {
    const err = new Error('الطالب مسجل في أتوبيس، يجب تأكيد الحذف الإجباري');
    err.code = 'STUDENT_SEATED';
    err.status = 400;
    throw err;
  }

  // Cascades to families and buses
  stmts.deleteStudent.run(stdNum);
  return { success: true, military_number: stdNum };
}).immediate;

// ============================================================
// SETTINGS UPDATE
// ============================================================

export function updateSettings(newSettings) {
  const maxSeated = stmts.getMaxSeatedBus.get()?.maxBus || 0;
  const requestedBusCount = Number(newSettings.busCount);

  if (requestedBusCount && requestedBusCount < maxSeated) {
    const err = new Error(`لا يمكن تقليل عدد الأتوبيسات إلى ${requestedBusCount} لوجود عائلات مسجلة في أتوبيس رقم ${maxSeated}`);
    err.code = 'BUS_IN_USE';
    err.status = 400;
    throw err;
  }

  return saveSettings(newSettings);
}

// ============================================================
// RESET SEATING
// ============================================================

export const resetSeating = db.transaction(() => {
  stmts.deleteAllBusSeats.run();
  return { success: true };
}).immediate;

// ============================================================
// EXCEL IMPORT (TRANSACTIONAL, ALL-OR-NOTHING)
// ============================================================

export const importStudents = db.transaction((studentsList, mode = 'skip') => {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < studentsList.length; i++) {
    const s = studentsList[i];
    const stdNum = String(s.military_number || '').trim();
    const stdName = String(s.name || '').trim();

    if (!stdNum || !stdName) {
      errors.push(`صف ${i + 1}: الرقم العسكري واسم الطالب مطلوبان`);
      continue;
    }

    const existing = stmts.getStudent.get(stdNum);
    if (existing) {
      if (mode === 'update') {
        // Update student name
        stmts.updateStudent.run(stdName, stdNum);
        // Replace family members (seating is untouched!)
        stmts.deleteFamiliesByStudent.run(stdNum);
        if (Array.isArray(s.families)) {
          for (const m of s.families) {
            const mName = String(m.name || '').trim();
            if (mName) {
              const natId = String(m.national_id || '').trim();
              const rel = String(m.relation || '').trim();
              stmts.insertFamily.run(stdNum, mName, natId, rel);
            }
          }
        }
        updated++;
      } else {
        skipped++;
      }
    } else {
      stmts.insertStudent.run(stdNum, stdName);
      if (Array.isArray(s.families)) {
        for (const m of s.families) {
          const mName = String(m.name || '').trim();
          if (mName) {
            const natId = String(m.national_id || '').trim();
            const rel = String(m.relation || '').trim();
            stmts.insertFamily.run(stdNum, mName, natId, rel);
          }
        }
      }
      inserted++;
    }
  }

  return { inserted, updated, skipped, errors };
}).immediate;

export default {
  getState,
  seatStudent,
  unseatStudent,
  moveStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  updateSettings,
  resetSeating,
  importStudents
};
