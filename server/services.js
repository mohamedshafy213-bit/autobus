import db from './db.js';

// ============================================================
// PREPARED STATEMENTS (for performance)
// ============================================================
const stmts = {
  // Students
  getAllStudents: db.prepare('SELECT * FROM students ORDER BY number'),
  getStudent: db.prepare('SELECT * FROM students WHERE number = ?'),
  insertStudent: db.prepare('INSERT INTO students (number, name) VALUES (?, ?)'),
  updateStudent: db.prepare('UPDATE students SET number = ?, name = ? WHERE number = ?'),
  deleteStudent: db.prepare('DELETE FROM students WHERE number = ?'),

  // Family members
  getAllMembers: db.prepare('SELECT * FROM family_members ORDER BY student_number, id'),
  getMembersByStudent: db.prepare('SELECT * FROM family_members WHERE student_number = ? ORDER BY id'),
  getMember: db.prepare('SELECT * FROM family_members WHERE id = ?'),
  insertMember: db.prepare('INSERT INTO family_members (id, student_number, name, relation, attended, attended_at) VALUES (?, ?, ?, ?, ?, ?)'),
  updateMemberAttendance: db.prepare('UPDATE family_members SET attended = ?, attended_at = ? WHERE id = ?'),
  updateMemberStudentNumber: db.prepare('UPDATE family_members SET student_number = ? WHERE student_number = ?'),
  deleteMember: db.prepare('DELETE FROM family_members WHERE id = ?'),
  deleteMembersByStudent: db.prepare('DELETE FROM family_members WHERE student_number = ?'),
  resetAllAttendance: db.prepare('UPDATE family_members SET attended = 0, attended_at = NULL'),
  markAllAttended: db.prepare('UPDATE family_members SET attended = 1, attended_at = ? WHERE student_number = ?'),
  unmarkAllAttended: db.prepare('UPDATE family_members SET attended = 0, attended_at = NULL WHERE student_number = ?'),

  // Bus assignments
  getAllAssignments: db.prepare('SELECT * FROM bus_assignments ORDER BY bus_number, student_number'),
  getAssignment: db.prepare('SELECT * FROM bus_assignments WHERE student_number = ?'),
  insertAssignment: db.prepare('INSERT OR REPLACE INTO bus_assignments (student_number, bus_number, assigned_at) VALUES (?, ?, ?)'),
  deleteAssignment: db.prepare('DELETE FROM bus_assignments WHERE student_number = ?'),
  deleteAssignmentsByBus: db.prepare('DELETE FROM bus_assignments WHERE bus_number = ?'),
  clearAllAssignments: db.prepare('DELETE FROM bus_assignments'),

  // Buses
  getAllBuses: db.prepare('SELECT * FROM buses ORDER BY number'),
  getBus: db.prepare('SELECT * FROM buses WHERE number = ?'),
  insertBus: db.prepare('INSERT INTO buses (number, max_families, max_persons) VALUES (?, ?, ?)'),
  updateBus: db.prepare('UPDATE buses SET max_families = ?, max_persons = ? WHERE number = ?'),
  deleteBus: db.prepare('DELETE FROM buses WHERE number = ?'),
  getMaxBusNumber: db.prepare('SELECT MAX(number) as maxNum FROM buses'),

  // Settings
  getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
  setSetting: db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'),
};

// ============================================================
// STATE SNAPSHOT (single endpoint for polling)
// ============================================================
export function getFullState() {
  const students = stmts.getAllStudents.all();
  const familyMembers = stmts.getAllMembers.all().map(m => ({
    id: m.id,
    studentNumber: m.student_number,
    name: m.name,
    relation: m.relation,
    attended: !!m.attended,
    attendedAt: m.attended_at
  }));
  const assignedFamilies = stmts.getAllAssignments.all().map(a => ({
    studentNumber: a.student_number,
    busNumber: a.bus_number,
    assignedAt: a.assigned_at
  }));
  const buses = stmts.getAllBuses.all().map(b => ({
    number: b.number,
    maxFamilies: b.max_families,
    maxPersons: b.max_persons
  }));

  const lastPrintStaffRaw = stmts.getSetting.get('lastPrintStaff');
  const lastPrintStaff = lastPrintStaffRaw ? JSON.parse(lastPrintStaffRaw.value) : { manager: '' };

  return { students, familyMembers, assignedFamilies, buses, lastPrintStaff };
}

// ============================================================
// STUDENT CRUD
// ============================================================
export const addStudent = db.transaction(({ number, name, members = [] }) => {
  const numStr = String(number).trim();
  const nameStr = String(name).trim();

  if (!numStr || !nameStr) throw new Error('يرجى إدخال رقم واسم الطالب');

  const exists = stmts.getStudent.get(numStr);
  if (exists) throw new Error(`رقم الطالب (${numStr}) مسجل مسبقاً`);

  stmts.insertStudent.run(numStr, nameStr);

  members.forEach((m, idx) => {
    const mName = typeof m === 'string' ? m.trim() : (m.name || '').trim();
    const mRelation = typeof m === 'object' ? (m.relation || 'فرد أسرة') : 'فرد أسرة';
    if (mName) {
      const id = 'mem_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substring(2, 6);
      stmts.insertMember.run(id, numStr, mName, mRelation, 0, null);
    }
  });

  return { success: true, student: { number: numStr, name: nameStr } };
});

export const updateStudent = db.transaction(({ oldNumber, number, name }) => {
  const oldNumStr = String(oldNumber).trim();
  const newNumStr = String(number).trim();
  const nameStr = String(name).trim();

  const student = stmts.getStudent.get(oldNumStr);
  if (!student) throw new Error('لم يتم العثور على الطالب');

  if (oldNumStr !== newNumStr) {
    const dup = stmts.getStudent.get(newNumStr);
    if (dup) throw new Error(`رقم الطالب الجديد (${newNumStr}) مستخدم بالفعل`);
    // Update FK references
    stmts.updateMemberStudentNumber.run(newNumStr, oldNumStr);
    // Update bus assignments
    const assignment = stmts.getAssignment.get(oldNumStr);
    if (assignment) {
      stmts.deleteAssignment.run(oldNumStr);
      stmts.insertAssignment.run(newNumStr, assignment.bus_number, assignment.assigned_at);
    }
    stmts.deleteStudent.run(oldNumStr);
    stmts.insertStudent.run(newNumStr, nameStr);
  } else {
    db.prepare('UPDATE students SET name = ? WHERE number = ?').run(nameStr, oldNumStr);
  }

  return { success: true, message: 'تم تحديث بيانات الطالب' };
});

export const deleteStudent = db.transaction((studentNumber) => {
  const numStr = String(studentNumber).trim();
  stmts.deleteMembersByStudent.run(numStr);
  stmts.deleteAssignment.run(numStr);
  stmts.deleteStudent.run(numStr);
  return { success: true, message: 'تم حذف الطالب وأفراد أسرته' };
});

// ============================================================
// FAMILY MEMBER CRUD
// ============================================================
export function addFamilyMember(studentNumber, { name, relation = 'فرد أسرة' }) {
  const numStr = String(studentNumber).trim();
  const nameStr = String(name).trim();
  if (!nameStr) throw new Error('يرجى إدخال اسم فرد الأسرة');

  const id = 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  stmts.insertMember.run(id, numStr, nameStr, relation.trim() || 'فرد أسرة', 0, null);
  return { success: true, member: { id, studentNumber: numStr, name: nameStr, relation, attended: false, attendedAt: null } };
}

export function removeFamilyMember(memberId) {
  stmts.deleteMember.run(memberId);
  return { success: true, message: 'تم حذف فرد الأسرة' };
}

// ============================================================
// ATTENDANCE
// ============================================================
export function setMemberAttendance(memberId, attended = true) {
  const member = stmts.getMember.get(memberId);
  if (!member) throw new Error('فرد الأسرة غير موجود');

  const now = attended ? new Date().toISOString() : null;
  stmts.updateMemberAttendance.run(attended ? 1 : 0, now, memberId);

  // Check if all family attended
  const members = stmts.getMembersByStudent.all(member.student_number);
  const allAttended = members.length > 0 && members.every(m => m.id === memberId ? attended : !!m.attended);

  return { success: true, allAttended };
}

export function markAllFamilyMembersAttended(studentNumber) {
  const numStr = String(studentNumber).trim();
  const members = stmts.getMembersByStudent.all(numStr);
  if (members.length === 0) throw new Error('لا يوجد أفراد مسجلين لهذه الأسرة');

  const now = new Date().toISOString();
  stmts.markAllAttended.run(now, numStr);
  return { success: true, message: 'تم تأكيد وصول جميع أفراد الأسرة' };
}

export const unmarkAllFamilyMembersAttended = db.transaction((studentNumber) => {
  const numStr = String(studentNumber).trim();
  stmts.unmarkAllAttended.run(numStr);
  stmts.deleteAssignment.run(numStr);
  return { success: true, message: 'تم إلغاء حضور أفراد الأسرة وإخلاء الأتوبيس' };
});

// ============================================================
// BUS ASSIGNMENT (with conflict prevention)
// ============================================================
export const assignFamilyToBus = db.transaction((studentNumber, busNumber) => {
  const numStr = String(studentNumber).trim();
  const busNum = Number(busNumber);

  const student = stmts.getStudent.get(numStr);
  if (!student) throw new Error('الطالب غير موجود');

  const bus = stmts.getBus.get(busNum);
  if (!bus) throw new Error('الأتوبيس المحدد غير موجود');

  const members = stmts.getMembersByStudent.all(numStr);
  const attendedCount = members.filter(m => m.attended).length;
  const personsCount = attendedCount > 0 ? attendedCount : members.length;

  // Current bus stats
  const currentAssignments = stmts.getAllAssignments.all().filter(a => a.bus_number === busNum);
  const existingAssignment = stmts.getAssignment.get(numStr);
  const isAlreadyInSameBus = existingAssignment && existingAssignment.bus_number === busNum;

  let currentPersons = 0;
  currentAssignments.forEach(a => {
    const mems = stmts.getMembersByStudent.all(a.student_number);
    const att = mems.filter(m => m.attended).length;
    currentPersons += att > 0 ? att : mems.length;
  });

  const currentFamilies = currentAssignments.length;

  const newPersonsCount = currentPersons + (isAlreadyInSameBus ? 0 : personsCount);
  const newFamiliesCount = currentFamilies + (isAlreadyInSameBus ? 0 : 1);

  const exceedsPersons = newPersonsCount > bus.max_persons;
  const exceedsFamilies = newFamiliesCount > bus.max_families;
  const exceedsLimit = exceedsPersons || exceedsFamilies;

  // Perform the assignment (serialized transaction prevents double-seating)
  const now = new Date().toISOString();
  stmts.insertAssignment.run(numStr, busNum, now);

  return {
    success: true,
    busNumber: busNum,
    exceedsLimit,
    exceedsPersons,
    exceedsFamilies,
    newPersonsCount,
    maxPersons: bus.max_persons,
    newFamiliesCount,
    maxFamilies: bus.max_families,
    attendedCount
  };
});

export function unassignFamilyFromBus(studentNumber) {
  const numStr = String(studentNumber).trim();
  const assignment = stmts.getAssignment.get(numStr);
  if (!assignment) throw new Error('الأسرة غير مسكنة في أي أتوبيس');

  const prevBus = assignment.bus_number;
  stmts.deleteAssignment.run(numStr);
  return { success: true, previousBus: prevBus };
}

export const moveFamily = db.transaction((studentNumber, targetBusNumber) => {
  const numStr = String(studentNumber).trim();
  const targetNum = Number(targetBusNumber);

  const bus = stmts.getBus.get(targetNum);
  if (!bus) throw new Error('الأتوبيس المحدد غير موجود');

  const members = stmts.getMembersByStudent.all(numStr);
  const attendedCount = members.filter(m => m.attended).length;
  const familyPersons = attendedCount > 0 ? attendedCount : members.length;

  const currentAssignments = stmts.getAllAssignments.all().filter(a => a.bus_number === targetNum);
  const existingAssignment = stmts.getAssignment.get(numStr);
  const isAlreadyInSameBus = existingAssignment && existingAssignment.bus_number === targetNum;

  let currentPersons = 0;
  currentAssignments.forEach(a => {
    const mems = stmts.getMembersByStudent.all(a.student_number);
    const att = mems.filter(m => m.attended).length;
    currentPersons += att > 0 ? att : mems.length;
  });

  const currentFamilies = currentAssignments.length;
  const newFamiliesCount = currentFamilies + (isAlreadyInSameBus ? 0 : 1);
  const newPersonsCount = currentPersons + (isAlreadyInSameBus ? 0 : familyPersons);

  const exceedsFamilies = newFamiliesCount > bus.max_families;
  const exceedsPersons = newPersonsCount > bus.max_persons;
  const exceedsLimit = exceedsFamilies || exceedsPersons;

  const now = new Date().toISOString();
  stmts.insertAssignment.run(numStr, targetNum, now);

  return {
    success: true,
    newBusNumber: targetNum,
    exceedsLimit,
    exceedsPersons,
    exceedsFamilies,
    newPersonsCount,
    maxPersons: bus.max_persons,
    newFamiliesCount,
    maxFamilies: bus.max_families,
    message: `تم نقل الأسرة بنجاح إلى أتوبيس رقم ${targetNum}`
  };
});

// ============================================================
// BUS MANAGEMENT
// ============================================================
export function addBus(config = null) {
  const maxNumRow = stmts.getMaxBusNumber.get();
  const nextNumber = config?.number || ((maxNumRow?.maxNum || 0) + 1);
  stmts.insertBus.run(nextNumber, config?.maxFamilies || 8, config?.maxPersons || 40);
  return { success: true, bus: { number: nextNumber, maxFamilies: config?.maxFamilies || 8, maxPersons: config?.maxPersons || 40 } };
}

export function removeBus(busNumber) {
  const targetNum = Number(busNumber);
  const assignments = stmts.getAllAssignments.all().filter(a => a.bus_number === targetNum);
  if (assignments.length > 0) {
    throw new Error(`لا يمكن حذف أتوبيس رقم ${targetNum} لوجود أسر مسكنة بداخله. يرجى نقلهم أو إلغاء تسكينهم أولاً.`);
  }
  stmts.deleteBus.run(targetNum);
  return { success: true, message: `تم حذف أتوبيس رقم ${targetNum}` };
}

export function updateBusLimits(busNumber, maxFamilies, maxPersons) {
  stmts.updateBus.run(maxFamilies, maxPersons, Number(busNumber));
  return { success: true };
}

// ============================================================
// RESET / CLEAR
// ============================================================
export const resetAllCheckIns = db.transaction(() => {
  stmts.resetAllAttendance.run();
  stmts.clearAllAssignments.run();
  return { success: true, message: 'تم تصفير تسجيلات الحضور وإخلاء الأتوبيسات' };
});

export const clearAllData = db.transaction(() => {
  db.exec('DELETE FROM bus_assignments');
  db.exec('DELETE FROM family_members');
  db.exec('DELETE FROM students');
  // Keep buses but reset to 28
  db.exec('DELETE FROM buses');
  const insertBus = db.prepare('INSERT INTO buses (number, max_families, max_persons) VALUES (?, ?, ?)');
  for (let i = 1; i <= 28; i++) {
    insertBus.run(i, 8, 40);
  }
  return { success: true, message: 'تم مسح جميع البيانات بالكامل والبرنامج فارغ الآن بـ 28 أتوبيس' };
});

// ============================================================
// SETTINGS
// ============================================================
export function setLastPrintStaff(staff) {
  stmts.setSetting.run('lastPrintStaff', JSON.stringify(staff));
}
