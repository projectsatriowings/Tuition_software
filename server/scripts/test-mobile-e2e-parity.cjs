const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
const INSTITUTE_ID = '0237162e-13be-4a81-b046-11d77bd62483';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.instituteId ? { 'x-institute-id': options.instituteId } : {}),
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function login(identifier, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
  if (res.data?.success && res.data.data?.accessToken) {
    return res.data.data.accessToken;
  }
  throw new Error(`Login failed for ${identifier}: ${JSON.stringify(res.data)}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('TuitionOS Mobile & Web E2E Parity Validation Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] Test ${total}: ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${total}: ${message}`);
    }
  }

  try {
    // 1. Role Authentication & Token Verification
    console.log('--- 1. Multi-Role Authentication & Session Tokens ---');
    const adminToken = await login('admin@apexacademy.com', 'Password#123');
    assert(!!adminToken, 'Academic Admin / Director (Dr. Rajesh Sharma) logs in successfully');

    const staffToken = await login('teacher@apexacademy.com', 'Password#123');
    assert(!!staffToken, 'Faculty / Staff (Anita Verma) logs in successfully');

    const studentToken = await login('student@apexacademy.com', 'Password#123');
    assert(!!studentToken, 'Student (Aarav Kumar) logs in successfully');

    // 2. Staff Directory & Next Employee Code (Academic Admin)
    console.log('\n--- 2. Staff Management & Auto-Generated Employee Codes ---');
    const codeRes = await request('/staff/next-code', {
      token: adminToken,
      instituteId: INSTITUTE_ID,
    });
    const nextEmpCode = codeRes.data?.data?.employeeCode || codeRes.data?.data?.nextCode;
    assert(codeRes.status === 200 && nextEmpCode, `Next employee code generated: ${nextEmpCode}`);

    const staffListRes = await request('/staff', {
      token: adminToken,
      instituteId: INSTITUTE_ID,
    });
    assert(staffListRes.status === 200 && Array.isArray(staffListRes.data?.data?.staff || staffListRes.data?.data), 'Admin retrieves full faculty directory');

    // 3. Exam Grading Roster & Mark Entry (Phase 3B Verification)
    console.log('\n--- 3. Staff Exam Grading Roster & Marks Submission ---');
    const examsRes = await request('/exams', {
      token: staffToken,
      instituteId: INSTITUTE_ID,
    });
    assert(examsRes.status === 200 && Array.isArray(examsRes.data?.data?.exams || examsRes.data?.data), 'Staff fetches assigned exams roster');

    const exams = Array.isArray(examsRes.data?.data) ? examsRes.data.data : examsRes.data?.data?.exams || [];
    if (exams.length > 0) {
      const exam = exams[0];
      const rosterRes = await request(`/exams/${exam.id}/eligible-students`, {
        token: staffToken,
        instituteId: INSTITUTE_ID,
      });
      assert(rosterRes.status === 200, `Roster loaded for exam: ${exam.title}`);

      const students = rosterRes.data?.data?.students || [];
      if (students.length > 0) {
        const studentToGrade = students[0];
        const gradeRes = await request(`/exams/${exam.id}/marks`, {
          method: 'POST',
          token: staffToken,
          instituteId: INSTITUTE_ID,
          body: {
            marks: [
              {
                studentId: studentToGrade.studentId || studentToGrade.id,
                marksObtained: 88,
                isAbsent: false,
                remarks: 'Strong comprehension in problem solving',
              },
            ],
            isDraft: true,
          },
        });
        assert(gradeRes.status === 200 && gradeRes.data?.success, 'Staff saves draft marks entry with teacher remarks');
      }
    }

    // 4. Student Quiz Taker Workflow (Phase 3A Verification)
    console.log('\n--- 4. Student Interactive Quiz Taker & Automated Grading ---');
    const studentQuizzesRes = await request('/quizzes', {
      token: studentToken,
      instituteId: INSTITUTE_ID,
    });
    assert(studentQuizzesRes.status === 200, 'Student retrieves available published quizzes');

    const quizzes = studentQuizzesRes.data?.data?.quizzes || studentQuizzesRes.data?.data || [];
    if (quizzes.length > 0) {
      const targetQuiz = quizzes[0];
      const startRes = await request(`/quizzes/${targetQuiz.id}/start`, {
        method: 'POST',
        token: studentToken,
        instituteId: INSTITUTE_ID,
      });
      assert(startRes.status === 200 && startRes.data?.success, 'Student starts quiz attempt');

      const attempt = startRes.data?.data?.attempt;
      const questions = startRes.data?.data?.quiz?.questions || [];
      assert(questions.length > 0, `Quiz has ${questions.length} questions loaded`);

      // Security check: correct answer keys must not be leaked to taker
      let hasLeakedKey = false;
      questions.forEach((q) => {
        (q.options || []).forEach((opt) => {
          if (opt.isCorrect !== undefined) hasLeakedKey = true;
        });
      });
      assert(!hasLeakedKey, 'Security check passed: Option answer keys (isCorrect) are strictly hidden');

      // Submit quiz answers
      if (attempt && questions.length > 0) {
        const answersPayload = questions.map((q) => ({
          questionId: q.id,
          selectedOptionIds: q.options?.[0]?.id ? [q.options[0].id] : [],
        }));

        const submitRes = await request(`/quizzes/${targetQuiz.id}/submit`, {
          method: 'POST',
          token: studentToken,
          instituteId: INSTITUTE_ID,
          body: {
            attemptId: attempt.id,
            answers: answersPayload,
          },
        });
        assert(submitRes.status === 200 && submitRes.data?.success, 'Server evaluates and grades student quiz submission');
        assert(typeof submitRes.data?.data?.percentage === 'number', `Automated score evaluated: ${submitRes.data?.data?.percentage}%`);
      }
    }

    // 5. Parent Reviews & Faculty Responses (Phase 3C Verification)
    console.log('\n--- 5. Parent Reviews & Faculty Response Workflow ---');
    const reviewsRes = await request('/reviews', {
      token: staffToken,
      instituteId: INSTITUTE_ID,
    });
    assert(reviewsRes.status === 200 && reviewsRes.data?.success, 'Staff retrieves parent reviews & feedback list');

    const reviews = reviewsRes.data?.data?.reviews || reviewsRes.data?.data || [];
    if (reviews.length > 0) {
      const reviewToReply = reviews[0];
      const replyRes = await request(`/reviews/${reviewToReply.id}/reply`, {
        method: 'PATCH',
        token: staffToken,
        instituteId: INSTITUTE_ID,
        body: {
          reply: 'Thank you for your feedback. Our academic team is committed to continuous student excellence.',
        },
      });
      assert(replyRes.status === 200 && replyRes.data?.success, 'Staff submits official faculty response to parent review');
    }

    // 6. Learning Material Engagement Analytics (Phase 3C Verification)
    console.log('\n--- 6. Material Engagement Analytics & Telemetry ---');
    const materialsRes = await request('/materials', {
      token: staffToken,
      instituteId: INSTITUTE_ID,
    });
    const materials = materialsRes.data?.data?.materials || materialsRes.data?.data || [];
    if (materials.length > 0) {
      const sampleMat = materials[0];
      const analyticsRes = await request(`/materials/${sampleMat.id}/interactions`, {
        token: staffToken,
        instituteId: INSTITUTE_ID,
      });
      assert(analyticsRes.status === 200 && analyticsRes.data?.success, `Staff retrieves engagement analytics for material: ${sampleMat.title}`);
    }

    // 7. Document Streaming & Preview (Range Request Verification)
    console.log('\n--- 7. Large Document Byte-Range Streaming ---');
    if (materials.length > 0) {
      const pdfMat = materials.find((m) => m.fileName && m.fileName.toLowerCase().endsWith('.pdf')) || materials[0];
      const streamRes = await request(`/materials/${pdfMat.id}/download`, {
        token: staffToken,
        instituteId: INSTITUTE_ID,
        headers: { Range: 'bytes=0-1023' },
      });
      assert(streamRes.status === 206 || streamRes.status === 200, `Document preview streams with status ${streamRes.status}`);
    }

    console.log('\n================================================================');
    console.log(`E2E Parity Test Summary: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
    console.log('================================================================\n');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
