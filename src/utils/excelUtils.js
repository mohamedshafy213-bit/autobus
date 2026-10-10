import * as XLSX from 'xlsx';
import { normalizeArabic } from './arabicUtils.js';

export const TEMPLATE_COLUMNS = [
  'الرقم العسكري',
  'اسم الطالب',
  'اسم المدعو رباعي',
  'درجة القرابة',
  'الرقم القومي'
];

/**
 * Generate and download the official template "قالب_الطلاب_والأسر.xlsx" (Left to Right, no رقم الدعوة)
 */
export function downloadTemplateExcel() {
  const sampleData = [
    {
      'الرقم العسكري': '54620',
      'اسم الطالب': 'عمرو خالد منصور محمد',
      'اسم المدعو رباعي': 'غادة مصلحي إسماعيل محمد',
      'درجة القرابة': 'الأم',
      'الرقم القومي': '27606250104569'
    },
    {
      'الرقم العسكري': '54620',
      'اسم الطالب': 'عمرو خالد منصور محمد',
      'اسم المدعو رباعي': 'رضوي خالد منصور محمد',
      'درجة القرابة': 'الأخت',
      'الرقم القومي': '30108181301961'
    },
    {
      'الرقم العسكري': '54620',
      'اسم الطالب': 'عمرو خالد منصور محمد',
      'اسم المدعو رباعي': 'سلمي خالد منصور محمد',
      'درجة القرابة': 'الأخت',
      'الرقم القومي': '30712061303965'
    },
    {
      'الرقم العسكري': '54620',
      'اسم الطالب': 'عمرو خالد منصور محمد',
      'اسم المدعو رباعي': 'شريف منصور محمد سيد أحمد',
      'درجة القرابة': 'العم',
      'الرقم القومي': '28202101305799'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData, { header: TEMPLATE_COLUMNS });
  
  // Set sheet direction to Left to Right (LTR)
  ws['!views'] = [{ RTL: false }];

  // Auto-fit column widths
  ws['!cols'] = [
    { wch: 18 }, // الرقم العسكري
    { wch: 28 }, // اسم الطالب
    { wch: 30 }, // اسم المدعو رباعي
    { wch: 16 }, // درجة القرابة
    { wch: 22 }  // الرقم القومي
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'البيانات');

  XLSX.writeFile(wb, 'قالب_الطلاب_والأسر.xlsx');
}

/**
 * Parse uploaded Excel file and group rows by military number with validations
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellText: true,
          raw: false // Read all cells strictly as text
        });

        const sheetName = workbook.SheetNames.includes('البيانات') 
          ? 'البيانات' 
          : workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!rawRows || rawRows.length === 0) {
          resolve({
            success: false,
            error: 'الملف فارغ أو لا يحتوي على صفوف بيانات.'
          });
          return;
        }

        const validationProblems = [];
        const studentMap = new Map();

        rawRows.forEach((row, idx) => {
          const rowNum = idx + 2; // 1-indexed header is row 1

          // Extract fields with normalization
          let militaryNumber = '';
          let studentName = '';
          let memberName = '';
          let relation = '';
          let nationalId = '';

          for (const [key, val] of Object.entries(row)) {
            const cleanKey = String(key).trim();
            const cleanVal = String(val).trim();

            if (cleanKey === 'الرقم العسكري' || cleanKey.includes('عسكري') || cleanKey.includes('military')) {
              militaryNumber = cleanVal;
            } else if (cleanKey === 'اسم الطالب' || cleanKey.includes('طالب') || cleanKey.includes('student')) {
              studentName = cleanVal;
            } else if (cleanKey === 'اسم المدعو رباعي' || cleanKey.includes('مدعو') || cleanKey.includes('مرافق') || cleanKey.includes('member')) {
              memberName = cleanVal;
            } else if (cleanKey === 'درجة القرابة' || cleanKey.includes('قرابة') || cleanKey.includes('relation')) {
              relation = cleanVal;
            } else if (cleanKey === 'الرقم القومي' || cleanKey.includes('قومي') || cleanKey.includes('national')) {
              nationalId = cleanVal;
            }
          }

          // Validation: military number & student name required
          if (!militaryNumber) {
            validationProblems.push({
              row: rowNum,
              type: 'error',
              message: `الصف ${rowNum}: الرقم العسكري مفقود`
            });
            return;
          }

          if (!studentName) {
            validationProblems.push({
              row: rowNum,
              type: 'error',
              message: `الصف ${rowNum}: اسم الطالب مفقود`
            });
            return;
          }

          // Member validation
          if (!memberName) {
            validationProblems.push({
              row: rowNum,
              type: 'warning',
              message: `الصف ${rowNum}: اسم المدعو فارغ (سيتم تسجيل الطالب فقط)`
            });
          }

          if (nationalId && nationalId.length !== 14) {
            validationProblems.push({
              row: rowNum,
              type: 'warning',
              message: `الصف ${rowNum}: الرقم القومي ليس 14 رقماً (${nationalId})`
            });
          }

          // Group by military number
          if (!studentMap.has(militaryNumber)) {
            studentMap.set(militaryNumber, {
              military_number: militaryNumber,
              name: studentName,
              families: []
            });
          } else {
            // Check if student name is consistent
            const existing = studentMap.get(militaryNumber);
            if (normalizeArabic(existing.name) !== normalizeArabic(studentName)) {
              validationProblems.push({
                row: rowNum,
                type: 'warning',
                message: `الصف ${rowNum}: تكرار الرقم العسكري (${militaryNumber}) باسم مختلف ("${studentName}" مقابل "${existing.name}")`
              });
            }
          }

          if (memberName) {
            studentMap.get(militaryNumber).families.push({
              name: memberName,
              relation: relation || 'فرد أسرة',
              national_id: nationalId
            });
          }
        });

        const groupedStudents = Array.from(studentMap.values());
        let totalMembers = 0;
        groupedStudents.forEach(s => {
          totalMembers += s.families.length;
        });

        resolve({
          success: true,
          students: groupedStudents,
          totalRows: rawRows.length,
          studentCount: groupedStudents.length,
          memberCount: totalMembers,
          validationProblems
        });
      } catch (err) {
        console.error('Excel parse error:', err);
        resolve({
          success: false,
          error: 'فشل في قراءة ملف Excel: ' + (err.message || 'تأكد من سلامة صيغة الملف')
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: 'تعذر قراءة الملف من الجهاز.' });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export current database state to Excel format with bus number and arrival status (Left to Right, no رقم الدعوة)
 */
export function exportCurrentDataExcel(studentsList) {
  const exportRows = [];

  studentsList.forEach(student => {
    const families = student.families || [];
    const busText = student.bus_number ? `أتوبيس ${student.bus_number}` : 'لم يسكّن';
    const statusText = student.bus_number ? 'حضر' : 'لم يحضر';

    if (families.length === 0) {
      exportRows.push({
        'الرقم العسكري': student.military_number,
        'اسم الطالب': student.name,
        'اسم المدعو رباعي': '—',
        'درجة القرابة': '—',
        'الرقم القومي': '—',
        'رقم الأتوبيس': busText,
        'حالة الحضور': statusText
      });
    } else {
      families.forEach((mem) => {
        exportRows.push({
          'الرقم العسكري': student.military_number,
          'اسم الطالب': student.name,
          'اسم المدعو رباعي': mem.name || '',
          'درجة القرابة': mem.relation || '',
          'الرقم القومي': mem.national_id || '',
          'رقم الأتوبيس': busText,
          'حالة الحضور': statusText
        });
      });
    }
  });

  const columns = [
    ...TEMPLATE_COLUMNS,
    'رقم الأتوبيس',
    'حالة الحضور'
  ];

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: columns });
  
  // Set sheet direction to Left to Right (LTR)
  ws['!views'] = [{ RTL: false }];

  ws['!cols'] = [
    { wch: 18 }, // الرقم العسكري
    { wch: 28 }, // اسم الطالب
    { wch: 30 }, // اسم المدعو رباعي
    { wch: 16 }, // درجة القرابة
    { wch: 22 }, // الرقم القومي
    { wch: 16 }, // رقم الأتوبيس
    { wch: 14 }  // حالة الحضور
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'البيانات');

  const fileName = `بيانات_منظومة_الأتوبيسات_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
