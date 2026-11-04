const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying Fee Structures in DB ---');
  const apex = await prisma.institute.findFirst({
    where: { code: 'APEX01' },
    include: {
      feeStructures: {
        include: { batch: true },
      },
      students: true,
    },
  });

  if (!apex) throw new Error('Apex Tuition Academy not found');
  console.log(`Apex has ${apex.feeStructures.length} fee structures:`);
  for (const fs of apex.feeStructures) {
    console.log(`- [${fs.frequency}] ${fs.name}: ₹${fs.amount} (Class/Grade: ${fs.classGrade || 'N/A'}, Components: ${fs.componentsJson ? fs.componentsJson.length : 0})`);
  }

  const student = apex.students[0];
  const monthlyStructure = apex.feeStructures.find(f => f.frequency === 'MONTHLY');
  if (!student || !monthlyStructure) throw new Error('Missing student or monthly structure');

  console.log(`\nTesting Fee Assignment to Student ${student.firstName} ${student.lastName}...`);

  // Clean up any test assignment if existing
  await prisma.studentFeeAssignment.deleteMany({
    where: {
      studentId: student.id,
      feeStructureId: monthlyStructure.id,
      termLabel: 'November 2026 Test',
    },
  });

  // Test 1: Assignment without discount
  const assign1 = await prisma.studentFeeAssignment.create({
    data: {
      studentId: student.id,
      feeStructureId: monthlyStructure.id,
      termLabel: 'November 2026 Test',
      academicYear: '2026-2027',
      baseAmount: monthlyStructure.amount,
      discountAmount: 500.00,
      discountReason: 'Merit Scholarship - High Scorer in Class 9 Board',
      finalAmount: Number(monthlyStructure.amount) - 500.00,
      dueDate: new Date('2026-11-20'),
      componentsJson: monthlyStructure.componentsJson,
    },
  });
  console.log(`Created Assignment 1: ID ${assign1.id}, Final Amount: ₹${assign1.finalAmount}, Discount: ₹${assign1.discountAmount} (Reason: ${assign1.discountReason})`);

  // Test 2: Duplicate check
  try {
    await prisma.studentFeeAssignment.create({
      data: {
        studentId: student.id,
        feeStructureId: monthlyStructure.id,
        termLabel: 'November 2026 Test',
        academicYear: '2026-2027',
        baseAmount: monthlyStructure.amount,
        finalAmount: monthlyStructure.amount,
        dueDate: new Date('2026-11-20'),
      },
    });
    throw new Error('FAILED: Expected duplicate assignment to fail!');
  } catch (err) {
    if (err.code === 'P2002') {
      console.log('PASSED: Unique constraint studentId_feeStructureId_termLabel successfully blocked duplicate billing.');
    } else {
      throw err;
    }
  }

  // Clean up test assignment
  await prisma.studentFeeAssignment.delete({ where: { id: assign1.id } });
  console.log('Cleaned up test assignment cleanly.');
  console.log('\nAll Backend DB & Model Tests PASSED!');
}

main()
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

