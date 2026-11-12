require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findUnique({
    where: { id: '326cc8e8-8cd7-4fac-a2ea-780e7476add2' },
    include: {
      user: true,
      enrollments: { include: { batch: true } },
      attendanceEvents: true,
      examMarks: { include: { exam: true } },
    }
  });
  console.log('Sharika Rajan student record:', {
    id: student.id,
    name: student.firstName + ' ' + student.lastName,
    admissionNumber: student.admissionNumber,
    user: student.user ? { email: student.user.email, phone: student.user.phone, role: student.user.role } : null,
    batches: student.enrollments.map(e => e.batch.name),
    attendanceEvents: student.attendanceEvents.map(a => ({ date: a.eventDate, type: a.eventType, isLate: a.isLate })),
    examMarks: student.examMarks.length
  });
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
