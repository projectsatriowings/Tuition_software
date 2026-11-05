const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apex = await prisma.institute.findFirst({
    where: { code: 'APEX01' },
  });

  if (!apex) {
    console.error('Apex Tuition Academy not found');
    process.exit(1);
  }

  const structuresToAdd = [
    {
      instituteId: apex.id,
      batchId: null, // Institute-wide: applies to any Class 6-8 student
      classGrade: 'Class 6 - 8',
      courseName: 'Middle School Foundation (Math, Science, English)',
      name: 'Class 6 - 8 Middle School Foundation Program',
      description: 'Comprehensive foundation coaching covering NCERT Mathematics, Science, and English grammar with weekly chapter tests.',
      academicYear: '2026-2027',
      frequency: 'MONTHLY',
      amount: 2500.00,
      dueDay: 10,
      componentsJson: [
        { name: 'Tuition & Classroom Coaching', amount: 1800, category: 'TUITION' },
        { name: 'Workbooks & Daily Practice Sheets', amount: 400, category: 'MATERIALS' },
        { name: 'Weekly Chapter Tests & Quiz Series', amount: 300, category: 'EXAMINATION' },
      ],
      installmentsJson: null,
      isActive: true,
    },
    {
      instituteId: apex.id,
      batchId: null,
      classGrade: 'Class 6 - 8',
      courseName: 'Single Subject Focus',
      name: 'Class 6 - 8 Single Subject Tuition (Math or Science)',
      description: 'Focused individual subject coaching for Class 6, 7, or 8 in either Mathematics or Science.',
      academicYear: '2026-2027',
      frequency: 'MONTHLY',
      amount: 1200.00,
      dueDay: 10,
      componentsJson: [
        { name: 'Subject Specific Coaching', amount: 1000, category: 'TUITION' },
        { name: 'Study Notes & Practice Problem Sets', amount: 200, category: 'MATERIALS' },
      ],
      installmentsJson: null,
      isActive: true,
    },
    {
      instituteId: apex.id,
      batchId: null,
      classGrade: 'Class 1 - 5',
      courseName: 'Primary All Subjects',
      name: 'Class 1 - 5 Primary Tuition & Homework Support',
      description: 'Daily evening tuition for primary school students covering reading, writing, basic mathematics, and daily homework guidance.',
      academicYear: '2026-2027',
      frequency: 'MONTHLY',
      amount: 1800.00,
      dueDay: 10,
      componentsJson: [
        { name: 'Daily Tuition & Homework Help', amount: 1500, category: 'TUITION' },
        { name: 'Activity Sheets & Learning Workbooks', amount: 300, category: 'MATERIALS' },
      ],
      installmentsJson: null,
      isActive: true,
    },
    {
      instituteId: apex.id,
      batchId: null,
      classGrade: 'Class 9',
      courseName: 'CBSE Foundation',
      name: 'Class 9 Foundation & Pre-Board Preparation',
      description: 'In-depth concepts for Class 9 CBSE/State board in Mathematics and Science to build a strong base for Class 10.',
      academicYear: '2026-2027',
      frequency: 'MONTHLY',
      amount: 3800.00,
      dueDay: 10,
      componentsJson: [
        { name: 'Tuition & Problem Solving Classes', amount: 2800, category: 'TUITION' },
        { name: 'Comprehensive Study Modules', amount: 500, category: 'MATERIALS' },
        { name: 'Monthly Mock Tests & Assessments', amount: 500, category: 'EXAMINATION' },
      ],
      installmentsJson: null,
      isActive: true,
    },
  ];

  for (const s of structuresToAdd) {
    const existing = await prisma.feeStructure.findFirst({
      where: { instituteId: apex.id, name: s.name },
    });

    if (existing) {
      await prisma.feeStructure.update({
        where: { id: existing.id },
        data: s,
      });
      console.log(`Updated structure: ${s.name}`);
    } else {
      await prisma.feeStructure.create({
        data: s,
      });
      console.log(`Created structure: ${s.name}`);
    }
  }

  const all = await prisma.feeStructure.findMany({
    where: { instituteId: apex.id },
    select: { name: true, classGrade: true, frequency: true, amount: true },
    orderBy: { amount: 'asc' },
  });

  console.log(`\nApex Tuition Academy now has ${all.length} fee structures across all class levels:`);
  for (const item of all) {
    console.log(`- [${item.classGrade || 'All Classes'}] ${item.name} (${item.frequency}): ₹${item.amount}`);
  }
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

