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
      AND attended = 1
  `),
  insertBusSeat: db.prepare('INSERT INTO buses (bus_number, student_number, seated_at) VALUES (?, ?, ?)'),
  updateBusSeat: db.prepare('UPDATE buses SET bus_number = ?, seated_at = ? WHERE student_number = ?'),
  deleteBusSeat: db.prepare('DELETE FROM buses WHERE student_number = ?'),
  deleteAllBusSeats: db.prepare('DELETE FROM buses'),
  getMaxSeatedBus: db.prepare('SELECT MAX(bus_number) as maxBus FROM buses'),

  setAllFamiliesAttendedByStudent: db.prepare('UPDATE families SET attended = 1 WHERE student_number = ?'),
  resetFamiliesAttendedByStudent: db.prepare('UPDATE families SET attended = 0 WHERE student_number = ?'),
  setFamilyAttendedById: db.prepare('UPDATE families SET attended = ? WHERE id = ? AND student_number = ?')
};

/**
 * Update attendance for a student's family members
 */
function updateStudentFamilyAttendance(stdNum, attendedMemberIds) {
  if (Array.isArray(attendedMemberIds)) {
    stmts.resetFamiliesAttendedByStudent.run(stdNum);
    for (const memId of attendedMemberIds) {
      stmts.setFamilyAttendedById.run(1, Number(memId), stdNum);
    }
  } else {
    stmts.setAllFamiliesAttendedByStudent.run(stdNum);
  }
}

/**
 * Get attending persons count for a specific student family (1 student + attended members)
 */
function getAttendingPersonsCount(stdNum, attendedMemberIds) {
  if (Array.isArray(attendedMemberIds)) {
    const family = stmts.getFamiliesByStudent.all(stdNum);
    const validIds = new Set(family.map(f => Number(f.id)));
    const matched = attendedMemberIds.filter(id => validIds.has(Number(id)));
    return 1 + matched.length;
  }
  const members = stmts.countFamiliesByStudent.get(stdNum)?.cnt || 0;
  return 1 + members;
}

/**
 * Get current capacity counts for a bus inside a transaction
 */
function getBusCountsInsideTx(busNumber) {
  const familiesCount = stmts.countFamiliesInBus.get(busNumber)?.cnt || 0;
  const membersCount = stmts.countMembersInBus.get(busNumber)?.cnt || 0;
  // Total persons = 1 student per family + attended family members
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
      relation: f.relation || '',
      attended: f.attended === 1
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
    const attendedMemsCount = mems.filter(m => m.attended).length;
    // When seated: persons_count is 1 (student) + attended members.
    // When not seated: persons_count is 1 + all registered members.
    const persons_count = seat ? (1 + attendedMemsCount) : (1 + mems.length);
    return {
      military_number: student.military_number,
      name: student.name,
      families: mems,
      bus_number: seat ? seat.bus_number : null,
      seated_at: seat ? seat.seated_at : null,
      persons_count,
      total_registered_persons: 1 + mems.length,
      attended_members_count: attendedMemsCount
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
export const seatStudent = db.transaction((studentNumber, busNumber, attendedMemberIds) => {
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
  const thisFamilyPersons = getAttendingPersonsCount(stdNum, attendedMemberIds);

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

  // 6. Update family member attendance
  updateStudentFamilyAttendance(stdNum, attendedMemberIds);

  return {
    success: true,
    studentNumber: stdNum,
    busNumber: busNum,
    seated_at: seatedAt,
    attendingPersons: thisFamilyPersons
  };
}).immediate;

/**
 * Auto-seat a student into the first available bus with enough capacity
 */
export const autoSeatStudent = db.transaction((studentNumber, attendedMemberIds) => {
  const stdNum = String(studentNumber || '').trim();
  const student = stmts.getStudent.get(stdNum);
  if (!student) {
    const err = new Error('الطالب غير مسجل بالمنظومة');
    err.code = 'STUDENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  const existingSeat = stmts.getBusSeatByStudent.get(stdNum);
  if (existingSeat) {
    const err = new Error(`هذه العائلة مسجلة بالفعل في أتوبيس رقم ${existingSeat.bus_number}`);
    err.code = 'ALREADY_SEATED';
    err.status = 409;
    err.busNumber = existingSeat.bus_number;
    throw err;
  }

  const settings = getSettings();
  const thisFamilyPersons = getAttendingPersonsCount(stdNum, attendedMemberIds);

  let assignedBus = null;
  for (let b = 1; b <= settings.busCount; b++) {
    const limits = getBusLimits(b, settings);
    const counts = getBusCountsInsideTx(b);
    if (counts.familiesCount + 1 <= limits.maxFamilies && counts.personsCount + thisFamilyPersons <= limits.maxPersons) {
      assignedBus = b;
      break;
    }
  }

  if (!assignedBus) {
    const err = new Error(`جميع الأتوبيسات ممتلئة ولا تتسع لعدد أفراد هذه العائلة (${thisFamilyPersons} فرد)`);
    err.code = 'ALL_BUSES_FULL';
    err.status = 409;
    throw err;
  }

  const seatedAt = new Date().toISOString();
  stmts.insertBusSeat.run(assignedBus, stdNum, seatedAt);

  updateStudentFamilyAttendance(stdNum, attendedMemberIds);

  return {
    success: true,
    studentNumber: stdNum,
    busNumber: assignedBus,
    seated_at: seatedAt,
    autoSeated: true,
    attendingPersons: thisFamilyPersons
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
  stmts.setAllFamiliesAttendedByStudent.run(stdNum);
  return { success: true, studentNumber: stdNum };
}).immediate;

/**
 * Move a student to another bus with capacity validation
 */
export const moveStudent = db.transaction((studentNumber, targetBusNumber, attendedMemberIds) => {
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

  const currentBus = existingSeat.bus_number;
  const settings = getSettings();
  if (!targetBus || targetBus < 1 || targetBus > settings.busCount) {
    const err = new Error('رقم الأتوبيس غير صالح');
    err.code = 'INVALID_BUS_NUMBER';
    err.status = 400;
    throw err;
  }

  // Update attendance if provided
  if (attendedMemberIds !== undefined) {
    updateStudentFamilyAttendance(stdNum, attendedMemberIds);
  }

  const thisFamilyPersons = getAttendingPersonsCount(stdNum, attendedMemberIds);

  // If targetBus is different from currentBus, check capacity
  if (targetBus !== currentBus) {
    const limits = getBusLimits(targetBus, settings);
    const counts = getBusCountsInsideTx(targetBus);

    if (counts.familiesCount + 1 > limits.maxFamilies) {
      const err = new Error(`الأتوبيس رقم ${targetBus} لم يعد يتسع (اكتمل عدد العائلات)، اختر أتوبيساً آخر`);
      err.code = 'BUS_FULL';
      err.status = 409;
      err.busNumber = targetBus;
      throw err;
    }

    if (counts.personsCount + thisFamilyPersons > limits.maxPersons) {
      const err = new Error(`الأتوبيس رقم ${targetBus} لم يعد يتسع لعدد أفراد هذه العائلة (${thisFamilyPersons} فرد)، اختر أتوبيساً آخر`);
      err.code = 'BUS_FULL';
      err.status = 409;
      err.busNumber = targetBus;
      throw err;
    }

    const seatedAt = new Date().toISOString();
    stmts.updateBusSeat.run(targetBus, seatedAt, stdNum);
  }

  return {
    success: true,
    studentNumber: stdNum,
    busNumber: targetBus,
    previousBus: currentBus,
    seated_at: new Date().toISOString(),
    attendingPersons: thisFamilyPersons
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
  db.prepare('UPDATE families SET attended = 1').run();
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

export const deleteAllStudents = db.transaction(() => {
  stmts.deleteAllBusSeats.run();
  db.prepare('DELETE FROM families').run();
  db.prepare('DELETE FROM students').run();
  return { success: true };
}).immediate;

// ============================================================
// REPLICATION SNAPSHOT (PRIMARY <-> BACKUP SYNC)
// ============================================================

export function getReplicationSnapshot() {
  const students = stmts.getAllStudents.all();
  const families = stmts.getAllFamilies.all();
  const buses = stmts.getAllBusSeats.all();
  const settings = getSettings();
  return {
    version: Date.now(),
    timestamp: new Date().toISOString(),
    students,
    families,
    buses,
    settings
  };
}

export const applyReplicationSnapshot = db.transaction((snapshot) => {
  if (!snapshot || !Array.isArray(snapshot.students)) {
    throw new Error('بيانات المزامنة غير صالحة');
  }

  // 1. Wipe existing data atomically
  stmts.deleteAllBusSeats.run();
  db.prepare('DELETE FROM families').run();
  db.prepare('DELETE FROM students').run();

  // 2. Insert students
  const insertStd = db.prepare('INSERT INTO students (military_number, name) VALUES (?, ?)');
  for (const s of snapshot.students) {
    insertStd.run(s.military_number, s.name);
  }

  // 3. Insert families
  const insertFam = db.prepare('INSERT INTO families (id, student_number, name, national_id, relation, attended) VALUES (?, ?, ?, ?, ?, ?)');
  for (const f of snapshot.families || []) {
    insertFam.run(
      f.id !== undefined && f.id !== null ? Number(f.id) : null,
      f.student_number,
      f.name,
      f.national_id || '',
      f.relation || '',
      f.attended === 0 ? 0 : 1
    );
  }

  // 4. Insert bus seats
  const insertSeat = db.prepare('INSERT INTO buses (bus_number, student_number, seated_at) VALUES (?, ?, ?)');
  for (const b of snapshot.buses || []) {
    insertSeat.run(Number(b.bus_number), b.student_number, b.seated_at || new Date().toISOString());
  }

  // 5. Update settings if included
  if (snapshot.settings && typeof snapshot.settings === 'object') {
    saveSettings(snapshot.settings);
  }

  return {
    success: true,
    studentsCount: snapshot.students.length,
    familiesCount: (snapshot.families || []).length,
    seatedCount: (snapshot.buses || []).length,
    timestamp: new Date().toISOString()
  };
}).immediate;

export default {
  getState,
  getReplicationSnapshot,
  applyReplicationSnapshot,
  seatStudent,
  autoSeatStudent,
  unseatStudent,
  moveStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  deleteAllStudents,
  updateSettings,
  resetSeating,
  importStudents
};
