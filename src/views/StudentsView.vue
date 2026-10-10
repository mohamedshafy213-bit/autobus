<template>
  <div class="space-y-6 pb-12">
    
    <!-- Top Action Bar -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 class="text-2xl font-black text-slate-900 flex items-center gap-2">
          <i class="pi pi-users text-emerald-600 text-2xl"></i>
          <span>إدارة الطلاب وأسرهم</span>
        </h2>
        <p class="text-xs text-slate-500 mt-1 font-semibold">
          تسجيل بيانات الطلاب والمرافقين، واستيراد وتصدير ملفات Excel
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <Button
          label="إضافة طالب وأسرته"
          icon="pi pi-plus"
          class="!bg-emerald-600 !border-emerald-600 !text-white font-bold text-xs shadow-sm hover:!bg-emerald-700"
          :disabled="store.isWriteDisabled"
          @click="openAddStudentModal"
        />

        <Button
          label="تحميل قالب Excel"
          icon="pi pi-download"
          severity="secondary"
          outlined
          class="font-bold text-xs"
          title="تحميل قالب إكسيل الرسمي الفارغ لإدخال البيانات"
          @click="downloadTemplateExcel"
        />

        <Button
          label="رفع من ملف Excel"
          icon="pi pi-upload"
          severity="secondary"
          outlined
          class="font-bold text-xs"
          :disabled="store.isWriteDisabled"
          title="استيراد وتحديث بيانات الطلاب من ملف إكسيل"
          @click="triggerFileInput"
        />

        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx, .xls"
          class="hidden"
          @change="handleFileUpload"
        />

        <Button
          label="تصدير البيانات"
          icon="pi pi-file-excel"
          class="!bg-slate-800 !border-slate-800 !text-white font-bold text-xs hover:!bg-slate-900"
          title="تصدير قاعدة بيانات الطلاب والأسر وحالة التسكين بصيغة Excel"
          @click="handleExportExcel"
        />
      </div>
    </div>

    <!-- Students DataTable Card -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      <!-- Table Search & Summary Header -->
      <div class="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-800 text-sm">سجل الطلاب المسجلين</span>
          <span class="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
            {{ store.students.length }} طالب
          </span>
        </div>

        <div class="w-full sm:w-72">
          <IconField iconPosition="left">
            <InputIcon class="pi pi-search text-xs" />
            <InputText
              v-model="searchTerm"
              placeholder="ابحث بالاسم أو الرقم العسكري..."
              class="w-full !text-xs !py-2"
            />
          </IconField>
        </div>
      </div>

      <!-- DataTable -->
      <DataTable
        :value="filteredStudentsList"
        v-model:expandedRows="expandedRows"
        paginator
        :rows="15"
        :rowsPerPageOptions="[15, 30, 50, 100]"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        stripedRows
        dataKey="military_number"
      >
        <template #empty>
          <div class="p-8 text-center">
            <i class="pi pi-inbox text-4xl text-slate-300 mb-2"></i>
            <div class="text-base font-bold text-slate-700">لا توجد بيانات طلاب مسجلة</div>
            <p class="text-xs text-slate-400 mt-1">اضغط "إضافة طالب" أو "رفع من ملف Excel" لبدء إدخال البيانات</p>
          </div>
        </template>

        <Column expander style="width: 3rem" />

        <Column field="military_number" header="الرقم العسكري" sortable style="width: 15%;">
          <template #body="{ data }">
            <span class="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block text-xs">
              {{ data.military_number }}
            </span>
          </template>
        </Column>

        <Column field="name" header="اسم الطالب" sortable style="width: 30%;">
          <template #body="{ data }">
            <span class="font-bold text-slate-900 text-sm">
              {{ data.name }}
            </span>
          </template>
        </Column>

        <Column header="المرافقين" sortable style="width: 12%;">
          <template #body="{ data }">
            <span class="font-mono font-bold text-slate-700 text-xs">
              {{ (data.families || []).length }} أفراد
            </span>
          </template>
        </Column>

        <Column header="إجمالي الأفراد" sortable style="width: 12%;">
          <template #body="{ data }">
            <span class="font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
              {{ data.persons_count }} فرد
            </span>
          </template>
        </Column>

        <Column header="حالة التسكين" style="width: 15%;">
          <template #body="{ data }">
            <Tag
              v-if="data.bus_number"
              :value="`أتوبيس ${data.bus_number}`"
              severity="success"
              class="!text-xs !font-bold font-mono"
            />
            <Tag
              v-else
              value="لم يحضر"
              severity="secondary"
              class="!text-xs !font-bold"
            />
          </template>
        </Column>

        <Column header="الإجراءات" style="width: 16%; text-align: center;">
          <template #body="{ data }">
            <div class="flex items-center justify-center gap-1.5">
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                outlined
                class="!py-1.5 !px-2.5 !text-xs font-bold"
                :disabled="store.isWriteDisabled"
                title="تعديل الطالب وأسرته"
                @click="openEditStudentModal(data)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                outlined
                class="!py-1.5 !px-2.5 !text-xs font-bold"
                :disabled="store.isWriteDisabled"
                title="حذف الطالب"
                @click="confirmDeleteStudent(data)"
              />
            </div>
          </template>
        </Column>

        <!-- Expansion: Family Members Detail -->
        <template #expansion="{ data }">
          <div class="p-4 bg-slate-50/80 rounded-xl border border-slate-200 my-2 me-4 ms-10">
            <div class="font-bold text-xs text-slate-700 mb-2 flex items-center gap-2">
              <i class="pi pi-users text-emerald-600"></i>
              <span>أفراد الأسرة المسجلين ({{ (data.families || []).length }} أفراد):</span>
            </div>

            <div v-if="!data.families || data.families.length === 0" class="text-xs text-slate-400 italic">
              لا يوجد مرافقين مسجلين لهذا الطالب.
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div
                v-for="member in data.families"
                :key="member.id"
                class="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs space-y-1"
              >
                <div class="font-bold text-slate-800">{{ member.name }}</div>
                <div class="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>القرابة: <strong>{{ member.relation || '—' }}</strong></span>
                  <span class="font-mono">{{ member.national_id || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </DataTable>

    </div>

    <!-- ======================================================== -->
    <!-- ADD / EDIT STUDENT DIALOG                                -->
    <!-- ======================================================== -->
    <Dialog
      v-model:visible="studentDialogVisible"
      modal
      :header="isEditing ? 'تعديل بيانات الطالب وأسرته' : 'إضافة طالب وأسرته'"
      :style="{ width: '680px', maxWidth: '96vw' }"
      class="student-dialog rounded-3xl"
    >
      <div class="space-y-5 p-2 max-h-[75vh] overflow-y-auto">
        
        <!-- Student Info Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              الرقم العسكري <span class="text-red-500">*</span>
            </label>
            <InputText
              v-model="studentForm.military_number"
              placeholder="مثال: 12345678"
              class="w-full !text-sm font-mono"
              :disabled="isEditing"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              اسم الطالب رباعي <span class="text-red-500">*</span>
            </label>
            <InputText
              v-model="studentForm.name"
              placeholder="الاسم بالكامل..."
              class="w-full !text-sm"
            />
          </div>
        </div>

        <!-- Dynamic Family Members List -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <i class="pi pi-users text-emerald-600"></i>
                <span>قائمة أفراد الأسرة المرافقين ({{ studentForm.families.length }})</span>
              </h4>
              <p class="text-[11px] text-slate-500">
                إجمالي الأفراد في الأتوبيس سيكون: {{ 1 + studentForm.families.length }} فرد (الطالب + الأسرة)
              </p>
            </div>

            <Button
              label="إضافة فرد"
              icon="pi pi-plus"
              size="small"
              class="!bg-emerald-600 !border-emerald-600 !text-white !text-xs !font-bold"
              @click="addFamilyRow"
            />
          </div>

          <div v-if="studentForm.families.length === 0" class="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500">
            لا يوجد مرافقين مضافين حالياً. اضغط "إضافة فرد" لإضافة اسم مرافق.
          </div>

          <!-- Family rows -->
          <div v-else class="space-y-2.5">
            <div
              v-for="(member, idx) in studentForm.families"
              :key="idx"
              class="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs"
            >
              <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                {{ idx + 1 }}
              </span>

              <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <InputText
                  v-model="member.name"
                  placeholder="اسم المرافق رباعي *"
                  class="w-full !text-xs"
                />
                <InputText
                  v-model="member.relation"
                  placeholder="صلة القرابة (الأب، الأم...)"
                  class="w-full !text-xs"
                />
                <InputText
                  v-model="member.national_id"
                  placeholder="الرقم القومي (14 رقم)"
                  class="w-full !text-xs font-mono"
                  maxlength="14"
                />
              </div>

              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                class="shrink-0"
                title="حذف هذا الفرد"
                @click="removeFamilyRow(idx)"
              />
            </div>
          </div>
        </div>

      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button
            label="إلغاء"
            severity="secondary"
            outlined
            class="!font-bold !text-xs"
            @click="studentDialogVisible = false"
          />
          <Button
            :label="isEditing ? 'حفظ التعديلات' : 'إضافة الطالب'"
            icon="pi pi-check"
            class="!bg-emerald-600 !border-emerald-600 !text-white !font-bold !text-xs"
            :loading="savingStudent"
            @click="submitStudentForm"
          />
        </div>
      </template>
    </Dialog>

    <!-- ======================================================== -->
    <!-- EXCEL IMPORT PREVIEW DIALOG                              -->
    <!-- ======================================================== -->
    <Dialog
      v-model:visible="importDialogVisible"
      modal
      header="معاينة استيراد بيانات الطلاب من Excel"
      :style="{ width: '880px', maxWidth: '96vw' }"
      class="import-dialog rounded-3xl"
    >
      <div v-if="importPreview" class="space-y-4 p-2 max-h-[75vh] overflow-y-auto">
        
        <!-- Summary Stats Card -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div class="text-center">
            <span class="text-xs text-slate-500 font-bold block">إجمالي الطلاب المكتشفين</span>
            <span class="text-2xl font-black text-slate-900 font-mono">{{ importPreview.studentCount }}</span>
          </div>
          <div class="text-center">
            <span class="text-xs text-slate-500 font-bold block">إجمالي أفراد الأسر</span>
            <span class="text-2xl font-black text-emerald-600 font-mono">{{ importPreview.memberCount }}</span>
          </div>
          <div class="text-center">
            <span class="text-xs text-slate-500 font-bold block">إجمالي الصفوف بالملف</span>
            <span class="text-2xl font-black text-blue-600 font-mono">{{ importPreview.totalRows }}</span>
          </div>
        </div>

        <!-- Import Mode Selection -->
        <div class="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
          <span class="text-xs font-bold text-amber-900 block">
            كيف ترغب في التعامل مع الطلاب المسجلين مسبقاً في النظام؟
          </span>
          <div class="flex items-center gap-4 text-xs font-bold text-slate-700">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="skip"
                v-model="importMode"
                class="text-emerald-600 focus:ring-emerald-500"
              />
              <span>تخطي الطلاب الموجودين مسبقاً (إبقاء بياناتهم كما هي)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="update"
                v-model="importMode"
                class="text-emerald-600 focus:ring-emerald-500"
              />
              <span>تحديث بياناتهم واستبدال أفراد الأسرة (لا يؤثر على تسكين الأتوبيس)</span>
            </label>
          </div>
        </div>

        <!-- Validation Warnings / Problems -->
        <div v-if="importPreview.validationProblems.length > 0" class="space-y-2">
          <h4 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i class="pi pi-exclamation-triangle text-amber-600"></i>
            <span>تنبيهات وملاحظات التحقق ({{ importPreview.validationProblems.length }} ملاحظة):</span>
          </h4>
          <div class="max-h-36 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
            <div
              v-for="(prob, idx) in importPreview.validationProblems"
              :key="idx"
              :class="prob.type === 'error' ? 'text-red-600 font-bold' : 'text-amber-700'"
            >
              • {{ prob.message }}
            </div>
          </div>
        </div>

        <!-- Preview DataTable -->
        <div>
          <h4 class="text-xs font-bold text-slate-800 mb-2">عينة من بيانات الطلاب المستوردة:</h4>
          <DataTable
            :value="importPreview.students.slice(0, 10)"
            responsiveLayout="scroll"
            class="p-datatable-sm"
            stripedRows
          >
            <Column field="military_number" header="الرقم العسكري" style="width: 20%;" />
            <Column field="name" header="اسم الطالب" style="width: 40%;" />
            <Column header="المرافقين" style="width: 20%;">
              <template #body="{ data }">
                {{ data.families.length }} مرافق
              </template>
            </Column>
            <Column header="إجمالي الأفراد" style="width: 20%;">
              <template #body="{ data }">
                {{ 1 + data.families.length }} فرد
              </template>
            </Column>
          </DataTable>
          <p v-if="importPreview.students.length > 10" class="text-[11px] text-slate-400 text-center mt-1">
            ... بالإضافة إلى {{ importPreview.students.length - 10 }} طالب آخر
          </p>
        </div>

      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button
            label="إلغاء"
            severity="secondary"
            outlined
            class="!font-bold !text-xs"
            @click="importDialogVisible = false"
          />
          <Button
            label="تأكيد الاستيراد وحفظ البيانات"
            icon="pi pi-check"
            class="!bg-emerald-600 !border-emerald-600 !text-white !font-bold !text-xs"
            :loading="executingImport"
            @click="submitImport"
          />
        </div>
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useBusesStore } from '../stores/busesStore.js';
import { downloadTemplateExcel, parseExcelFile, exportCurrentDataExcel } from '../utils/excelUtils.js';
import { matchesArabicQuery, normalizeArabic } from '../utils/arabicUtils.js';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const store = useBusesStore();
const confirm = useConfirm();
const toast = useToast();

const searchTerm = ref('');
const expandedRows = ref([]);
const fileInputRef = ref(null);

// Student Add/Edit state
const studentDialogVisible = ref(false);
const isEditing = ref(false);
const savingStudent = ref(false);
const studentForm = reactive({
  military_number: '',
  name: '',
  families: []
});

// Import state
const importDialogVisible = ref(false);
const importPreview = ref(null);
const importMode = ref('skip'); // 'skip' | 'update'
const executingImport = ref(false);

const filteredStudentsList = computed(() => {
  const query = (searchTerm.value || '').trim();
  if (!query) return store.students;

  return store.students.filter(s => {
    const matchNum = String(s.military_number).includes(query) ||
      normalizeArabic(s.military_number).includes(normalizeArabic(query));
    const matchName = matchesArabicQuery(s.name, query);
    const matchFam = (s.families || []).some(m => matchesArabicQuery(m.name, query));
    return matchNum || matchName || matchFam;
  });
});

function openAddStudentModal() {
  isEditing.value = false;
  studentForm.military_number = '';
  studentForm.name = '';
  studentForm.families = [
    { name: '', relation: 'الأب', national_id: '' },
    { name: '', relation: 'الأم', national_id: '' }
  ];
  studentDialogVisible.value = true;
}

function openEditStudentModal(student) {
  isEditing.value = true;
  studentForm.military_number = student.military_number;
  studentForm.name = student.name;
  studentForm.families = (student.families || []).map(f => ({
    name: f.name || '',
    relation: f.relation || '',
    national_id: f.national_id || ''
  }));
  studentDialogVisible.value = true;
}

function addFamilyRow() {
  studentForm.families.push({
    name: '',
    relation: 'فرد أسرة',
    national_id: ''
  });
}

function removeFamilyRow(index) {
  studentForm.families.splice(index, 1);
}

async function submitStudentForm() {
  const num = String(studentForm.military_number || '').trim();
  const name = String(studentForm.name || '').trim();

  if (!num) {
    toast.add({ severity: 'error', summary: 'خطأ', detail: 'يرجى إدخال الرقم العسكري', life: 3000 });
    return;
  }
  if (!name) {
    toast.add({ severity: 'error', summary: 'خطأ', detail: 'يرجى إدخال اسم الطالب', life: 3000 });
    return;
  }

  // Validate family rows
  for (let i = 0; i < studentForm.families.length; i++) {
    const mem = studentForm.families[i];
    if (!String(mem.name || '').trim()) {
      toast.add({ severity: 'error', summary: 'خطأ', detail: `يرجى إدخال اسم المرافق رقم ${i + 1}`, life: 3000 });
      return;
    }
    if (mem.national_id && String(mem.national_id).trim().length !== 14) {
      toast.add({ severity: 'warn', summary: 'تنبيه', detail: `الرقم القومي للمرافق "${mem.name}" ليس 14 رقماً`, life: 4000 });
    }
  }

  savingStudent.value = true;
  try {
    await store.saveStudent({
      military_number: num,
      name,
      families: studentForm.families.map(f => ({
        name: f.name.trim(),
        relation: (f.relation || '').trim(),
        national_id: (f.national_id || '').trim()
      }))
    }, isEditing.value);

    toast.add({
      severity: 'success',
      summary: 'تم الحفظ',
      detail: isEditing.value ? `تم تعديل بيانات الطالب ${name}` : `تم إضافة الطالب ${name} بنجاح`,
      life: 3000
    });

    studentDialogVisible.value = false;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'تعذر الحفظ',
      detail: err.message || 'حدث خطأ في الخادم',
      life: 4000
    });
  } finally {
    savingStudent.value = false;
  }
}

function confirmDeleteStudent(student) {
  const isSeated = !!student.bus_number;
  const message = isSeated
    ? `تنبيه: الطالب "${student.name}" مسكن في أتوبيس رقم ${student.bus_number}. هل تريد تأكيد الحذف الإجباري وإلغاء التسكين وحذف أسرته؟`
    : `هل أنت متأكد من حذف الطالب "${student.name}" وبيانات أسرته نهائياً؟`;

  confirm.require({
    message,
    header: 'تأكيد حذف الطالب',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'نعم، حذف',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await store.deleteStudent(student.military_number, isSeated);
        toast.add({
          severity: 'info',
          summary: 'تم الحذف',
          detail: `تم حذف الطالب ${student.name} بنجاح`,
          life: 3000
        });
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: 'تعذر الحذف',
          detail: err.message || 'حدث خطأ في الحذف',
          life: 4000
        });
      }
    }
  });
}

function triggerFileInput() {
  if (fileInputRef.value) fileInputRef.value.click();
}

async function handleFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const result = await parseExcelFile(file);
    if (!result.success) {
      toast.add({ severity: 'error', summary: 'خطأ في الملف', detail: result.error, life: 5000 });
      return;
    }

    importPreview.value = result;
    importDialogVisible.value = true;
  } finally {
    if (fileInputRef.value) fileInputRef.value.value = '';
  }
}

async function submitImport() {
  if (!importPreview.value || executingImport.value) return;

  executingImport.value = true;
  try {
    const report = await store.importStudents(importPreview.value.students, importMode.value);
    
    toast.add({
      severity: 'success',
      summary: 'اكتمل الاستيراد',
      detail: `تم إدخال ${report.inserted} جديد، وتحديث ${report.updated}، وتخطي ${report.skipped}`,
      life: 5000
    });

    importDialogVisible.value = false;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'فشل الاستيراد',
      detail: err.message || 'حدث خطأ أثناء حفظ بيانات الاستيراد',
      life: 5000
    });
  } finally {
    executingImport.value = false;
  }
}

function handleExportExcel() {
  if (store.students.length === 0) {
    toast.add({ severity: 'info', summary: 'تنبيه', detail: 'لا توجد بيانات طلاب لتصديرها حالياً', life: 3000 });
    return;
  }
  exportCurrentDataExcel(store.students);
  toast.add({ severity: 'success', summary: 'تم التصدير', detail: 'تم تحميل ملف البيانات بنجاح', life: 3000 });
}
</script>
