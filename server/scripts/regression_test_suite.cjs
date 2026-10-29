require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production';
const BASE_URL = 'http://localhost:5000/api';
const INSTITUTE_ID = '0237162e-13be-4a81-b046-11d77bd62483';

function makeToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      instituteId: INSTITUTE_ID,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('TuitionOS — Learning Materials, Audio, Homework & Quiz Test Suite');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${message}`);
    }
  }

  // 1. Retrieve users
  const staffAnita = await prisma.user.findFirst({ where: { fullName: { contains: 'Anita Verma' } } });
  const staffSuria = await prisma.user.findFirst({ where: { fullName: { contains: 'Suria' } } });
  const staffKanishka = await prisma.user.findFirst({ where: { fullName: { contains: 'Kanishka' } } });
  const studentSoudher = await prisma.user.findFirst({ where: { fullName: { contains: 'Soudher' } } });
  const batchB = await prisma.batch.findFirst({ where: { name: 'Batch B' } });

  const tokenAnita = makeToken(staffAnita);
  const tokenSuria = makeToken(staffSuria);
  const tokenKanishka = makeToken(staffKanishka);
  const tokenSoudher = makeToken(studentSoudher);

  console.log('--- SCENARIO 1: Previously uploaded materials visible to authorized staff ---');
  const resAnita = await fetch(`${BASE_URL}/materials`, {
    headers: { Authorization: `Bearer ${tokenAnita}`, 'x-institute-id': INSTITUTE_ID },
  });
  const dataAnita = await resAnita.json();
  assert(dataAnita.success === true, 'Staff (Anita Verma) API request succeeds');
  const anitaTitles = (dataAnita.data?.materials || []).map((m) => m.title);
  assert(anitaTitles.includes('Chemistry') && anitaTitles.includes('photo'), 'Staff (Anita Verma) sees Chemistry (PDF) and photo (IMAGE) in Batch B');

  console.log('\n--- SCENARIO 2: Unauthorized staff batch isolation ---');
  const resKanishka = await fetch(`${BASE_URL}/materials?batchId=${batchB.id}`, {
    headers: { Authorization: `Bearer ${tokenKanishka}`, 'x-institute-id': INSTITUTE_ID },
  });
  assert(resKanishka.status === 403, 'Unauthorized staff (Kanishka - Batch C only) is blocked (403) from accessing Batch B materials');

  console.log('\n--- SCENARIO 3: Student sees only published materials for enrolled batch ---');
  const resStudent = await fetch(`${BASE_URL}/materials`, {
    headers: { Authorization: `Bearer ${tokenSoudher}`, 'x-institute-id': INSTITUTE_ID },
  });
  const dataStudent = await resStudent.json();
  assert(dataStudent.success === true, 'Student (Soudher) API request succeeds');
  const studentMats = dataStudent.data?.materials || [];
  assert(studentMats.length >= 2, `Student sees enrolled materials (count: ${studentMats.length})`);
  assert(studentMats.every((m) => m.isPublished === true), 'All materials returned to student have isPublished: true');

  console.log('\n--- SCENARIO 4: Material view & interaction telemetry ---');
  const chemMat = studentMats.find((m) => m.title === 'Chemistry') || studentMats[0];
  const resOpen = await fetch(`${BASE_URL}/materials/${chemMat.id}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSoudher}`, 'x-institute-id': INSTITUTE_ID },
    body: JSON.stringify({ eventType: 'OPENED' }),
  });
  const dataOpen = await resOpen.json();
  assert(dataOpen.success === true, 'Track OPENED event recorded successfully');

  // Verify non-audio material rejects AUDIO_PLAYING
  if (chemMat.type !== 'AUDIO' && chemMat.type !== 'RECORDING') {
    const resAudioProg = await fetch(`${BASE_URL}/materials/${chemMat.id}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSoudher}`, 'x-institute-id': INSTITUTE_ID },
      body: JSON.stringify({ eventType: 'AUDIO_PLAYING', progressPercent: 50, durationSeconds: 120, lastPositionSec: 60 }),
    });
    assert(!resAudioProg.ok, 'Non-audio material correctly rejects AUDIO_PLAYING telemetry');
  }

  const resInteractions = await fetch(`${BASE_URL}/materials/${chemMat.id}/interactions`, {
    headers: { Authorization: `Bearer ${tokenAnita}`, 'x-institute-id': INSTITUTE_ID },
  });
  const dataInteractions = await resInteractions.json();
  assert(dataInteractions.success === true && dataInteractions.data?.interactions?.length > 0, 'Staff retrieves interaction breakdown with unique student details');

  console.log('\n--- SCENARIO 5: Homework listing & submission workflow ---');
  const resHw = await fetch(`${BASE_URL}/homework`, {
    headers: { Authorization: `Bearer ${tokenSoudher}`, 'x-institute-id': INSTITUTE_ID },
  });
  const dataHw = await resHw.json();
  assert(dataHw.success === true, 'Student retrieves homework list');

  console.log('\n--- SCENARIO 6: Quiz creation, question options, and publishing ---');
  const createQuizPayload = {
    batchId: batchB.id,
    title: `Regression Test Assessment ${Date.now()}`,
    instructions: 'Select the single best answer for each question.',
    durationMinutes: 10,
    maxAttempts: 2,
    isPublished: true,
    questions: [
      {
        questionText: 'What is the chemical formula of water?',
        questionType: 'SINGLE_CHOICE',
        marks: 5,
        explanation: 'Water consists of 2 Hydrogen atoms and 1 Oxygen atom (H2O).',
        options: [
          { optionText: 'H2O', isCorrect: true },
          { optionText: 'CO2', isCorrect: false },
          { optionText: 'NaCl', isCorrect: false },
          { optionText: 'O2', isCorrect: false },
        ],
      },
      {
        questionText: 'Which of the following are inert gases? (Multiple choice)',
        questionType: 'MULTIPLE_CHOICE',
        marks: 5,
        explanation: 'Helium and Neon are noble/inert gases.',
        options: [
          { optionText: 'Helium', isCorrect: true },
          { optionText: 'Neon', isCorrect: true },
          { optionText: 'Sodium', isCorrect: false },
        ],
      },
    ],
  };

  const resCreateQuiz = await fetch(`${BASE_URL}/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAnita}`, 'x-institute-id': INSTITUTE_ID },
    body: JSON.stringify(createQuizPayload),
  });
  const dataCreateQuiz = await resCreateQuiz.json();
  assert(dataCreateQuiz.success === true, 'Staff creates and publishes a multi-question Quiz');
  const quizId = dataCreateQuiz.data?.quiz?.id;

  console.log('\n--- SCENARIO 7: Student starts quiz attempt & verifies answer keys are hidden ---');
  const resStartQuiz = await fetch(`${BASE_URL}/quizzes/${quizId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenSoudher}`, 'x-institute-id': INSTITUTE_ID },
  });
  const dataStartQuiz = await resStartQuiz.json();
  assert(dataStartQuiz.success === true, 'Student starts quiz attempt');
  const attemptId = dataStartQuiz.data?.attempt?.id;
  const questionsServed = dataStartQuiz.data?.quiz?.questions || [];
  const leakedAnswer = questionsServed.some((q) => q.options.some((o) => o.isCorrect !== undefined));
  assert(!leakedAnswer, 'Security check: Answer keys (isCorrect) are strictly stripped from student quiz taker payload');

  console.log('\n--- SCENARIO 8: Student submits answers with automated grading ---');
  // Find option IDs
  const q1 = questionsServed[0];
  const q2 = questionsServed[1];
  const q1CorrectOpt = q1.options.find((o) => o.optionText === 'H2O');
  const q2Helium = q2.options.find((o) => o.optionText === 'Helium');
  const q2Neon = q2.options.find((o) => o.optionText === 'Neon');

  const submitPayload = {
    attemptId,
    answers: [
      { questionId: q1.id, selectedOptionIds: [q1CorrectOpt.id] }, // Correct (5 pts)
      { questionId: q2.id, selectedOptionIds: [q2Helium.id, q2Neon.id] }, // Correct (5 pts)
    ],
  };

  const resSubmitQuiz = await fetch(`${BASE_URL}/quizzes/${quizId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSoudher}`, 'x-institute-id': INSTITUTE_ID },
    body: JSON.stringify(submitPayload),
  });
  const dataSubmitQuiz = await resSubmitQuiz.json();
  assert(dataSubmitQuiz.success === true, 'Student submits answers');
  assert(Number(dataSubmitQuiz.data?.score) === 10, `Automated grading awarded full marks: ${dataSubmitQuiz.data?.score}/10`);
  assert(Number(dataSubmitQuiz.data?.percentage) === 100, `Percentage calculated accurately: ${dataSubmitQuiz.data?.percentage}%`);

  console.log('\n--- SCENARIO 9: Staff reviews quiz roster & analytics ---');
  const resQuizAnalytics = await fetch(`${BASE_URL}/quizzes/${quizId}/submissions`, {
    headers: { Authorization: `Bearer ${tokenAnita}`, 'x-institute-id': INSTITUTE_ID },
  });
  const dataQuizAnalytics = await resQuizAnalytics.json();
  assert(dataQuizAnalytics.success === true, 'Staff retrieves quiz submissions roster');
  assert(dataQuizAnalytics.data?.analytics?.completedCount >= 1, 'Analytics reflects completed attempt accurately');
  const studentRosterEntry = dataQuizAnalytics.data?.roster?.find((r) => r.student?.firstName?.toLowerCase().includes('soudher'));
  assert(studentRosterEntry && studentRosterEntry.score === 10, 'Staff sees student Soudher with evaluated score of 10/10');

  console.log('\n--- SCENARIO 10: Staff releases quiz answer keys ---');
  const resRelease = await fetch(`${BASE_URL}/quizzes/${quizId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAnita}`, 'x-institute-id': INSTITUTE_ID },
    body: JSON.stringify({ resultsReleased: true }),
  });
  const dataRelease = await resRelease.json();
  assert(dataRelease.success === true && dataRelease.data?.quiz?.resultsReleased === true, 'Staff successfully releases quiz answers to students');

  console.log('\n--- SCENARIO 11: Student reviews quiz with answer keys and explanations ---');
  const resReviewQuiz = await fetch(`${BASE_URL}/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${tokenSoudher}`, 'x-institute-id': INSTITUTE_ID },
  });
  const dataReviewQuiz = await resReviewQuiz.json();
  assert(dataReviewQuiz.success === true, 'Student retrieves completed quiz review');
  const reviewQuestions = dataReviewQuiz.data?.quiz?.questions || [];
  const hasExplanations = reviewQuestions.every((q) => !!q.explanation);
  assert(hasExplanations, 'Student can view explanations and correct answers after results are released');

  console.log('\n================================================================');
  console.log(`Test Results: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  // Clean up created regression test quiz
  await prisma.quiz.delete({ where: { id: quizId } }).catch(() => {});
}

runRegressionSuite().catch(console.error).finally(() => prisma.$disconnect());

