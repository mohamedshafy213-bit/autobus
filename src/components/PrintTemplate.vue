<template>
  <div class="print-container">
    <div
      v-for="(page, pIdx) in printBusPages"
      :key="page.key"
      class="print-page"
      :class="{ 'last-print-page': pIdx === printBusPages.length - 1 }"
      dir="rtl"
    >
      <!-- Top Title Header (Printed on BOTH Page 1 and Page 2) -->
      <div class="print-header">
        <div class="flex justify-between items-center border-b-2 border-black pb-1 mb-1">
          <div>
            <h1 class="text-lg font-black text-black leading-tight">
              منظومة الأتوبيسات
            </h1>
            <p class="text-[10px] text-gray-700 font-bold">
              كشف ركاب وتوزيع أسر الطلاب
            </p>
          </div>

          <div class="border-2 border-black px-3 py-0.5 rounded-lg text-center bg-gray-50 flex items-center gap-2">
            <span class="text-base font-black block text-black">
              أتوبيس رقم {{ page.bus.number }}
            </span>
            <span class="text-[11px] font-bold text-gray-800 bg-white border border-black px-1.5 py-0.2 rounded">
              صفحة {{ page.pageNumber }} من {{ page.totalPages }}
            </span>
          </div>
        </div>

        <!-- Manager & Print Date (Printed on BOTH Page 1 and Page 2) -->
        <div class="flex justify-between items-center text-[11px] border border-black px-2 py-0.5 rounded bg-gray-50 mb-1">
          <div class="flex items-center gap-1.5">
            <span class="text-gray-700 font-bold">قائد المأمورية:</span>
            <span class="font-black text-black text-xs">{{ staffData.manager || '.......................' }}</span>
          </div>

          <div class="flex items-center gap-1 font-mono text-gray-700 text-[10.5px]">
            <span class="font-sans text-gray-500 font-bold">تاريخ الطباعة:</span>
            <span>{{ printDate }}</span>
          </div>
        </div>
      </div>

      <!-- Passengers Table (Fixed 6 places per student, empty rows colored black to differentiate) -->
      <div class="print-table-wrapper">
        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 5%;">م</th>
              <th style="width: 45%;">الاسم</th>
              <th style="width: 10%;">صلة القرابة</th>
              <th style="width: 40%;">الرقم القومي</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="slot in page.slots" :key="slot.studentNumber">
              <!-- STUDENT HEADER ROW: Dark/bold, 1 row -->
              <tr class="student-header-row">
                <td class="col-num font-mono font-black text-xs">
                  {{ slot.studentNumber }}
                </td>
                <td colspan="3" class="student-title-cell">
                  <div class="flex items-center justify-between">
                    <span class="font-black text-black text-xs">
                      🎓 الطالب: {{ slot.student ? slot.student.name : '............................................................' }}
                    </span>
                    <span class="text-[10.5px] font-mono text-gray-800">
                      <template v-if="slot.student">
                        رقم عسكري: {{ slot.student.military_number }} | الحاضرين بالأتوبيس: {{ slot.student.persons_count }} فرد
                      </template>
                      <template v-else>
                        رقم عسكري: .................. | الحاضرين: .... فرد
                      </template>
                    </span>
                  </div>
                </td>
              </tr>

              <!-- FIXED 6 FAMILY ROWS: Empty rows have black color for instant differentiation -->
              <tr
                v-for="(member, mIdx) in slot.familySlots"
                :key="mIdx"
                class="family-row"
                :class="{ 'empty-member-row': !member }"
              >
                <!-- Number: only if member attended -->
                <td class="col-num font-mono text-gray-700 text-[10px]">
                  <span v-if="member">{{ slot.studentNumber }}.{{ mIdx + 1 }}</span>
                  <span v-else>&nbsp;</span>
                </td>

                <!-- Name -->
                <td class="col-name text-right">
                  <span v-if="member" class="text-black font-bold text-[11px]">
                    • {{ member.name }}
                  </span>
                  <span v-else>&nbsp;</span>
                </td>

                <!-- Relation -->
                <td class="col-relation text-center">
                  <span v-if="member" class="text-gray-800 text-[10.5px]">
                    {{ member.relation || 'فرد أسرة' }}
                  </span>
                  <span v-else>&nbsp;</span>
                </td>

                <!-- National ID: Prominent, bold, black, clear spacing -->
                <td class="col-nid text-center font-mono">
                  <span v-if="member && member.national_id" class="text-black font-black text-[12px] tracking-wider block">
                    {{ member.national_id }}
                  </span>
                  <span v-else>&nbsp;</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Page 1 Bottom Continuation Note (ONLY on Page 1) -->
      <div v-if="!page.isLastPage" class="print-page1-footer">
        <span>↲ تابع باقي كشف ركاب الأتوبيس وإجمالي المقاعد والتوقيع في الصفحة التالية (صفحة 2 من 2)</span>
      </div>

      <!-- Page 2 Footer: Totals and Signatures (ONLY on Page 2) -->
      <div v-else class="print-footer">
        <div class="flex justify-between items-center bg-gray-100 border border-black px-2.5 py-1 rounded text-xs font-bold mb-1">
          <div>
            إجمالي العائلات بالأتوبيس:
            <span class="text-black font-black mx-1">{{ page.bus.familiesCount }}</span>
            / {{ page.bus.maxFamilies }} عائلة
          </div>
          <div>
            إجمالي الأفراد الحاضرين:
            <span class="text-black font-black mx-1">{{ page.bus.personsCount }}</span>
            / {{ page.bus.maxPersons }} فرد
          </div>
          <div>
            المقاعد المتبقية:
            <span class="text-black font-black mx-1">{{ Math.max(0, page.bus.maxPersons - page.bus.personsCount) }}</span>
            مقعد
          </div>
        </div>

        <!-- Signature Line: قائد المأمورية -->
        <div class="flex justify-center text-center text-xs">
          <div class="border-t border-black pt-0.5 w-64">
            <span class="font-bold block text-xs">قائد المأمورية</span>
            <span class="text-gray-800 text-xs block mb-1 font-bold">({{ staffData.manager || '.......................' }})</span>
            <span class="text-gray-500 block text-[9.5px]">التوقيع: ............................</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import { formatArabicDate, formatArabicTime } from '../utils/arabicUtils.js';

const props = defineProps({
  targetBusNumber: {
    type: [Number, String],
    default: null
  },
  staff: {
    type: Object,
    default: () => ({
      manager: ''
    })
  }
});

const store = useBusesStore();

const staffData = computed(() => {
  return {
    manager: props.staff?.manager || ''
  };
});

const printDate = computed(() => {
  const now = new Date();
  return `${formatArabicDate(now)} — ${formatArabicTime(now)}`;
});

/**
 * Returns the family members to display for a student.
 * If attendance is tracked, returns attending members; otherwise returns registered members.
 */
function getStudentAttendingMembers(student) {
  if (!student || !student.families || !Array.isArray(student.families)) {
    return [];
  }
  const hasAttendedFlags = student.families.some(m => m.attended !== undefined && m.attended !== null);
  if (hasAttendedFlags) {
    const attended = student.families.filter(m => m.attended === true || m.attended === 1 || m.attended === '1');
    if (attended.length > 0) return attended;
  }
  return student.families;
}

/**
 * Generates EXACTLY TWO PAGES per bus:
 * - If maxFamilies is 9: Page 1 has 5 students, Page 2 has 4 students (Total 9).
 * - Fixed 6 places per student preserves separation between families and fills the sheet.
 * - Empty slots are styled with black color to visually differentiate them clearly.
 */
const printBusPages = computed(() => {
  let targetList = store.buses;
  if (props.targetBusNumber) {
    targetList = store.buses.filter(b => Number(b.number) === Number(props.targetBusNumber));
  }

  const pages = [];

  targetList.forEach(bus => {
    const seated = store.students.filter(s => s.bus_number === bus.number);
    let totalPersons = 0;
    seated.forEach(s => {
      totalPersons += (s.persons_count || (1 + (s.families ? s.families.length : 0)));
    });

    const maxFam = bus.maxFamilies || 8;
    const busInfo = {
      number: bus.number,
      maxFamilies: maxFam,
      maxPersons: bus.maxPersons || 40,
      familiesCount: seated.length,
      personsCount: totalPersons
    };

    // Total slots matches actual capacity or seated count (e.g. 9 for 9 families, not 10)
    const totalSlots = Math.max(seated.length, maxFam);
    const page1Count = Math.ceil(totalSlots / 2);
    const page2Count = totalSlots - page1Count;

    const pageCounts = [page1Count, page2Count];
    let currentGlobalIndex = 0;

    for (let pageNum = 1; pageNum <= 2; pageNum++) {
      const countForThisPage = pageCounts[pageNum - 1];
      const slots = [];

      for (let i = 0; i < countForThisPage; i++) {
        const studentIndex = currentGlobalIndex;
        currentGlobalIndex++;

        const realStudent = seated[studentIndex] || null;

        // Exactly 6 places for family members per student to keep layout structured & separated
        const familySlots = [];
        if (realStudent) {
          const members = getStudentAttendingMembers(realStudent);
          for (let m = 0; m < 6; m++) {
            familySlots.push(members[m] || null);
          }
        } else {
          for (let m = 0; m < 6; m++) {
            familySlots.push(null);
          }
        }

        slots.push({
          studentNumber: studentIndex + 1,
          student: realStudent,
          familySlots
        });
      }

      pages.push({
        key: `bus-${bus.number}-p${pageNum}`,
        bus: busInfo,
        pageNumber: pageNum,
        totalPages: 2,
        slots,
        isLastPage: pageNum === 2
      });
    }
  });

  return pages;
});
</script>

<style scoped>
/* Hidden on screen, visible only when printing */
.print-container {
  display: none;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 4mm 6mm;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    height: auto !important;
    min-height: 0 !important;
  }

  body * {
    visibility: hidden;
  }

  .print-container,
  .print-container * {
    visibility: visible;
  }

  .print-container {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    background: white;
  }

  .print-page,
  .print-page * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-page {
    width: 100%;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* CRITICAL: The last page must NEVER have a page-break-after to prevent trailing blank sheets */
  .print-page.last-print-page,
  .print-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }

  .print-header {
    width: 100%;
  }

  .print-table-wrapper {
    width: 100%;
    margin-top: 1px;
    margin-bottom: 1px;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid black;
    table-layout: fixed;
  }

  .print-table th {
    border: 1px solid black;
    background-color: #f3f4f6;
    padding: 2px 2px;
    font-size: 10.5px;
    font-weight: 800;
    text-align: center;
    color: black;
    height: 19px;
  }

  .student-header-row td {
    border: 1px solid black;
    border-top: 1.5px solid black;
    border-bottom: 1.5px solid black;
    background-color: #e5e7eb;
    padding: 1.5px 5px;
    height: 20px;
    vertical-align: middle;
  }

  .family-row td {
    border: 1px solid black;
    border-bottom: 1px solid #9ca3af;
    padding: 0.5px 4px;
    height: 17px;
    vertical-align: middle;
    line-height: 1.15;
  }

  /* Black color for empty rows so they are immediately differentiated */
  .empty-member-row td {
    background-color: #000000 !important;
    border: 1px solid #000000 !important;
    color: transparent !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .col-num {
    text-align: center;
  }

  .col-name {
    padding-right: 5px !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .print-page1-footer {
    padding-top: 2px;
    text-align: center;
    font-size: 10.5px;
    font-weight: bold;
    color: #4b5563;
    border-top: 1px solid #d1d5db;
  }

  .print-footer {
    padding-top: 2px;
    border-top: 1.5px solid black;
  }

  .no-print {
    display: none !important;
  }
}
</style>
