import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

// PrimeVue 4 & Aura Theme
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';

// PrimeVue Components
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Tag from 'primevue/tag';
import Badge from 'primevue/badge';
import ProgressBar from 'primevue/progressbar';
import Card from 'primevue/card';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';

// Main Stylesheet
import './assets/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-disabled',
      cssLayer: false
    }
  },
  locale: {
    startsWith: 'يبدأ بـ',
    contains: 'يحتوي على',
    notContains: 'لا يحتوي على',
    endsWith: 'ينتهي بـ',
    equals: 'يساوي',
    notEquals: 'لا يساوي',
    noFilter: 'بدون تصفية',
    lt: 'أقل من',
    lte: 'أقل من أو يساوي',
    gt: 'أكبر من',
    gte: 'أكبر من أو يساوي',
    dateIs: 'التاريخ هو',
    dateIsNot: 'التاريخ ليس',
    dateBefore: 'التاريخ قبل',
    dateAfter: 'التاريخ بعد',
    clear: 'مسح',
    apply: 'تطبيق',
    matchAll: 'مطابقة الكل',
    matchAny: 'مطابقة أي',
    addRule: 'إضافة شرط',
    removeRule: 'حذف الشرط',
    accept: 'نعم',
    reject: 'إلغاء',
    choose: 'اختر',
    upload: 'رفع',
    cancel: 'إلغاء',
    dayNames: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    dayNamesShort: ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
    dayNamesMin: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
    monthNames: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    monthNamesShort: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    today: 'اليوم',
    searchMessage: '{0} نتائج متاحة',
    selectionMessage: '{0} عناصر محددة',
    emptySelectionMessage: 'لم يتم تحديد أي عنصر',
    emptySearchMessage: 'لم يتم العثور على نتائج',
    emptyFilterMessage: 'لا توجد نتائج مطابقة للبحث',
    emptyMessage: 'لا توجد بيانات متاحة',
    aria: {
      trueLabel: 'نعم',
      falseLabel: 'لا',
      nullLabel: 'غير محدد',
      star: 'نجمة واحدة',
      stars: '{star} نجوم',
      selectAll: 'تحديد الكل',
      unselectAll: 'إلغاء تحديد الكل',
      close: 'إغلاق',
      previous: 'السابق',
      next: 'التالي',
      navigation: 'التنقل',
      scrollTop: 'الانتقال للأعلى'
    }
  }
});

app.use(ToastService);
app.use(ConfirmationService);

// Global Component Registration
app.component('Button', Button);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('InputText', InputText);
app.component('InputNumber', InputNumber);
app.component('Select', Select);
app.component('Dialog', Dialog);
app.component('Toast', Toast);
app.component('ConfirmDialog', ConfirmDialog);
app.component('Tag', Tag);
app.component('Badge', Badge);
app.component('ProgressBar', ProgressBar);
app.component('Card', Card);
app.component('IconField', IconField);
app.component('InputIcon', InputIcon);

app.mount('#app');
