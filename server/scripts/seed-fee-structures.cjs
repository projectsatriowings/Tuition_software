const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apex = await prisma.institute.findFirst({
    where: { code: 'APEX01' },
    include: { batches: true },
  });

  if (!apex) {
    console.error('Apex Tuition Academy (APEX01) not found');
    process.exit(1);
  }

  console.log(`Found institute ${apex.name} (${apex.id}) with ${apex.batches.length} batches.`);
  const grade10Batch = apex.batches.find(b => b.name.includes('Grade 10')) || apex.batches[0];

  const structuresToSeed = [
    {
      instituteId: apex.id,
      batchId: grade10Batch ? grade10Batch.id : null,
      classGrade: 'Class 10',
      courseName: 'Board Exam Comprehensive',
      name: 'Class 10 Board Exam Comprehensive Package',
      description: 'Covers Math, Science, and Social Science with weekly practice tests and printed worksheets.',
      academicYear: '2026-2027',
      frequency: 'MONTHLY',
      amount: 4500.00,
      dueDay: 10,
      componentsJson: [
        { name: 'Tuition & Live Classes', amount: 3500, category: 'TUITION' },
        { name: 'Study Material & Worksheets', amount: 500, category: 'MATERIALS' },
        { name: 'Monthly Mock Test Series', amount: 500, category: 'EXAMINATION' },
      ],
      installmentsJson: null,
      isActive: true,
    },
    {
      instituteId: apex.id,
      batchId: null, // Institute-wide / Class 12
      classGrade: 'Class 12',
      courseName: 'Physics & Chemistry Advanced',
      name: 'Class 12 Advanced Science Term Package',
      description: 'Intensive term-wise coaching for CBSE/State board Class 12 exams with practical demonstrations.',
      academicYear: '2026-2027',
      frequency: 'TERM_WISE',
      amount: 18000.00,
      dueDay: 5,
      componentsJson: [
        { name: 'Advanced Theory Lectures', amount: 13000, category: 'TUITION' },
        { name: 'Practical Lab & Experiments', amount: 3000, category: 'LAB' },
        { name: 'Printed Notes & Formula Modules', amount: 2000, category: 'MATERIALS' },
      ],
      installmentsJson: [
        { installmentNo: 1, label: 'Term 1 (At Enrollment)', percentage: 50, amount: 9000, dueOffsetDays: 0 },
        { installmentNo: 2, label: 'Term 2 (Mid-Session)', percentage: 50, amount: 9000, dueOffsetDays: 90 },
      ],
      isActive: true,
    },
    {
      instituteId: apex.id,
      batchId: null, // Multi-batch / competitive
      classGrade: 'Class 11 & 12',
      courseName: 'NEET / JEE Target',
      name: 'NEET & JEE Foundation 3-Stage Installment Plan',
      description: 'Rigorous competitive coaching covering 2,000+ problem sets, CBT portal access, and doubt desks.',
      academicYear: '2026-2027',
      frequency: 'INSTALLMENT_BASED',
      amount: 45000.00,
      dueDay: 15,
      componentsJson: [
        { name: 'Competitive Classroom Program', amount: 32000, category: 'TUITION' },
        { name: 'National CBT Mock Test Series & All-India Ranks', amount: 6000, category: 'EXAMINATION' },
        { name: 'Comprehensive Books & Daily Practice Papers (DPPs)', amount: 5000, category: 'MATERIALS' },
        { name: 'Digital Portal & Video Solutions Access', amount: 2000, category: 'TECH' },
      ],
      installmentsJson: [
        { installmentNo: 1, label: '1st Installment (At Admission)', percentage: 33.33, amount: 15000, dueOffsetDays: 0 },
        { installmentNo: 2, label: '2nd Installment (After 90 Days)', percentage: 33.33, amount: 15000, dueOffsetDays: 90 },
        { installmentNo: 3, label: '3rd Installment (After 180 Days)', percentage: 33.34, amount: 15000, dueOffsetDays: 180 },
      ],
      isActive: true,
    },
    {
      instituteId: apex.id,
      batchId: null, // Institute-wide
      classGrade: 'All Classes',
      courseName: 'General Admission',
      name: 'Annual Registration & Student Kit Fee',
      description: 'One-time admission registration, academy student ID, welcome kit, and orientation folder.',
      academicYear: '2026-2027',
      frequency: 'ONE_TIME',
      amount: 2500.00,
      dueDay: 1,
      componentsJson: [
        { name: 'Registration & Admin Fee', amount: 1500, category: 'ADMISSION' },
        { name: 'Academy Student ID & Welcome Kit', amount: 1000, category: 'MATERIALS' },
      ],
      installmentsJson: null,
      isActive: true,
    },
  ];

  for (const s of structuresToSeed) {
    const existing = await prisma.feeStructure.findFirst({
      where: { instituteId: apex.id, name: s.name },
    });

    if (existing) {
      console.log(`Updating existing structure: ${s.name}`);
      await prisma.feeStructure.update({
        where: { id: existing.id },
        data: s,
      });
    } else {
      console.log(`Creating structure: ${s.name}`);
      await prisma.feeStructure.create({
        data: s,
      });
    }
  }

  const count = await prisma.feeStructure.count({ where: { instituteId: apex.id } });
  console.log(`Seeding complete! Apex Tuition Academy now has ${count} active fee structures.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

