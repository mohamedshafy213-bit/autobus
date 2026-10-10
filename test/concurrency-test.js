import http from 'node:http';
import app from '../server/index.js';
import db from '../server/db.js';
import { getSettings, saveSettings } from '../server/settings.js';

const PORT = 3055; // Dedicated test port
let server;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 بدء اختبارات التزامن ومنع التعارض (Concurrency Tests)');
  console.log('====================================================\n');

  // Start ephemeral test server
  server = app.listen(PORT, '127.0.0.1');
  await new Promise(r => setTimeout(r, 500));

  let passedTests = 0;
  let totalTests = 3;

  try {
    // Clean test state
    db.prepare('DELETE FROM buses').run();
    db.prepare('DELETE FROM families').run();
    db.prepare('DELETE FROM students').run();

    // -------------------------------------------------------------
    // TEST 1: 20 Parallel requests for the SAME student
    // -------------------------------------------------------------
    console.log('📋 الاختبار 1: إرسال 20 طلب تسكين متزامن لنفس الطالب...');
    const testStudent1 = 'TEST_SAME_001';
    
    // Create student
    await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/students',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      military_number: testStudent1,
      name: 'طالب اختبار التزامن 1',
      families: [
        { name: 'مرافق 1', relation: 'أب', national_id: '29001011234567' },
        { name: 'مرافق 2', relation: 'أم', national_id: '29202021234568' }
      ]
    });

    // Fire 20 parallel seat requests for the same student into bus 1
    const promises1 = [];
    for (let i = 0; i < 20; i++) {
      promises1.push(request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/seat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        studentNumber: testStudent1,
        busNumber: 1
      }));
    }

    const results1 = await Promise.all(promises1);
    const successes1 = results1.filter(r => r.status === 200);
    const alreadySeated1 = results1.filter(r => r.status === 409 && r.data.code === 'ALREADY_SEATED');

    console.log(`   - الطلبات الناجحة (200 OK): ${successes1.length} (المطلوب: 1 بالضبط)`);
    console.log(`   - الطلبات المرفوضة بتعارض ALREADY_SEATED (409): ${alreadySeated1.length} (المطلوب: 19)`);

    if (successes1.length === 1 && alreadySeated1.length === 19) {
      console.log('   ✅ نجح الاختبار 1: منع تكرار نفس العائلة بنجاح 100%');
      passedTests++;
    } else {
      console.log('   ❌ فشل الاختبار 1');
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST 2: Parallel requests for DIFFERENT students exceeding bus capacity
    // -------------------------------------------------------------
    console.log('📋 الاختبار 2: إرسال طلبات متزامنة لطلاب مختلفين تتجاوز سعة الأتوبيس...');
    
    // Set Bus 2 limit to maxFamilies = 3, maxPersons = 15
    const settings = getSettings();
    settings.overrides = {
      ...settings.overrides,
      "2": { maxFamilies: 3, maxPersons: 15 }
    };
    saveSettings(settings);

    // Create 8 different students, each with 2 family members (3 persons total)
    const studentIds = [];
    for (let i = 1; i <= 8; i++) {
      const sId = `TEST_BUS2_${i}`;
      studentIds.push(sId);
      await request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/students',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        military_number: sId,
        name: `طالب سعة أتوبيس ${i}`,
        families: [
          { name: `مرافق أ ${i}`, relation: 'أب', national_id: '29001011234567' },
          { name: `مرافق ب ${i}`, relation: 'أم', national_id: '29202021234568' }
        ]
      });
    }

    // Fire 8 parallel seat requests for all 8 students into bus 2
    const promises2 = studentIds.map(sId => request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/seat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      studentNumber: sId,
      busNumber: 2
    }));

    const results2 = await Promise.all(promises2);
    const successes2 = results2.filter(r => r.status === 200);
    const busFull2 = results2.filter(r => r.status === 409 && r.data.code === 'BUS_FULL');

    // Verify DB count inside bus 2
    const seatedCountBus2 = db.prepare('SELECT COUNT(*) as cnt FROM buses WHERE bus_number = 2').get().cnt;

    console.log(`   - الطلبات المقبولة (200 OK): ${successes2.length} (المطلوب: 3 عائلات)`);
    console.log(`   - الطلبات المرفوضة BUS_FULL (409): ${busFull2.length} (المطلوب: 5 عائلات)`);
    console.log(`   - عدد العائلات الفعلي في قاعدة البيانات لأتوبيس 2: ${seatedCountBus2} (المطلوب: 3)`);

    if (successes2.length === 3 && busFull2.length === 5 && seatedCountBus2 === 3) {
      console.log('   ✅ نجح الاختبار 2: لم يتم تجاوز سعة الأتوبيس مطلقاً');
      passedTests++;
    } else {
      console.log('   ❌ فشل الاختبار 2');
    }
    console.log('');

    // -------------------------------------------------------------
    // TEST 3: Import test with 3 students, 10 members, duplicate & bad ID
    // -------------------------------------------------------------
    console.log('📋 الاختبار 3: اختبار استيراد Excel (3 طلاب، 10 أفراد، رقم مكرر، رقم قومي غير صالح)...');
    
    const importPayload = [
      {
        military_number: 'IMP_001',
        name: 'طالب استيراد أول',
        families: [
          { name: 'مرافق 1', relation: 'الأب', national_id: '29001011234567' },
          { name: 'مرافق 2', relation: 'الأم', national_id: '29001011234568' },
          { name: 'مرافق 3', relation: 'الأخ', national_id: '29001011234569' }
        ]
      },
      {
        military_number: 'IMP_002',
        name: 'طالب استيراد ثانٍ (رقم قومي غير صالح للتحذير)',
        families: [
          { name: 'مرافق 4', relation: 'الأب', national_id: '12345' }, // Bad national ID
          { name: 'مرافق 5', relation: 'الأم', national_id: '29001011234571' },
          { name: 'مرافق 6', relation: 'الأخت', national_id: '29001011234572' },
          { name: 'مرافق 7', relation: 'الزوجة', national_id: '29001011234573' }
        ]
      },
      {
        // Duplicate of IMP_001
        military_number: 'IMP_001',
        name: 'طالب استيراد مكرر',
        families: [
          { name: 'مرافق مكرر 8', relation: 'الأب', national_id: '29001011234574' },
          { name: 'مرافق مكرر 9', relation: 'الأم', national_id: '29001011234575' },
          { name: 'مرافق مكرر 10', relation: 'الأخ', national_id: '29001011234576' }
        ]
      }
    ];

    const importRes = await request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      students: importPayload,
      mode: 'skip'
    });

    console.log(`   - استجابة الاستيراد:`, importRes.data);
    const report = importRes.data;

    if (report.inserted === 2 && report.skipped === 1) {
      console.log('   ✅ نجح الاختبار 3: تم استيراد الطالبين وتخطي المكرر بنجاح');
      passedTests++;
    } else {
      console.log('   ❌ فشل الاختبار 3');
    }
    console.log('');

  } catch (err) {
    console.error('💥 خطأ غير متوقع أثناء تشغيل الاختبارات:', err);
  } finally {
    server.close();
  }

  // Summary
  console.log('====================================================');
  console.log(`🏁 ملخص نتائج الاختبارات: ${passedTests} من ${totalTests} اختبارات ناجحة`);
  if (passedTests === totalTests) {
    console.log('🎉 جميع اختبارات التزامن والاستيراد اجتازت بنجاح (ALL PASSED)!');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.log('⚠️ هناك اختبارات لم تجتز بنجاح.');
    console.log('====================================================\n');
    process.exit(1);
  }
}

runTests();
