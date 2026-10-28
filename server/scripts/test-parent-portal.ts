import { createOnlineOrderSchema, verifyOnlinePaymentSchema } from '../src/modules/fees/fees.controller.js';
import crypto from 'crypto';

interface TestCase {
  name: string;
  fn: () => boolean | Promise<boolean>;
}

const tests: TestCase[] = [
  {
    name: 'Validation: createOnlineOrderSchema validates correct payload',
    fn: () => {
      const valid = createOnlineOrderSchema.safeParse({
        studentId: '11111111-1111-1111-1111-111111111111',
        feeAssignmentId: '22222222-2222-2222-2222-222222222222',
        amount: 2500,
      });
      return valid.success === true;
    },
  },
  {
    name: 'Validation: createOnlineOrderSchema rejects negative or zero amount',
    fn: () => {
      const invalid = createOnlineOrderSchema.safeParse({
        studentId: '11111111-1111-1111-1111-111111111111',
        feeAssignmentId: '22222222-2222-2222-2222-222222222222',
        amount: -100,
      });
      return invalid.success === false;
    },
  },
  {
    name: 'Validation: createOnlineOrderSchema rejects non-UUID studentId',
    fn: () => {
      const invalid = createOnlineOrderSchema.safeParse({
        studentId: 'not-a-uuid',
        feeAssignmentId: '22222222-2222-2222-2222-222222222222',
        amount: 500,
      });
      return invalid.success === false;
    },
  },
  {
    name: 'Validation: verifyOnlinePaymentSchema validates valid payment payload',
    fn: () => {
      const valid = verifyOnlinePaymentSchema.safeParse({
        orderId: 'order_test_12345',
        paymentId: 'pay_test_67890',
        signature: 'abcdef1234567890',
      });
      return valid.success === true;
    },
  },
  {
    name: 'Validation: verifyOnlinePaymentSchema rejects missing signature',
    fn: () => {
      const invalid = verifyOnlinePaymentSchema.safeParse({
        orderId: 'order_test_12345',
        paymentId: 'pay_test_67890',
        signature: '',
      });
      return invalid.success === false;
    },
  },
  {
    name: 'Security: Cryptographic HMAC-SHA256 signature generation and timingSafeEqual verification',
    fn: () => {
      const secret = 'rzp_secret_test_key_32_chars_long!';
      const orderId = 'order_ABC1234567890';
      const paymentId = 'pay_XYZ9876543210';

      const validSig = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const tamperedSig = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|tampered_payment`)
        .digest('hex');

      const matches = crypto.timingSafeEqual(
        Buffer.from(validSig, 'utf8'),
        Buffer.from(validSig, 'utf8')
      );

      const rejected = !crypto.timingSafeEqual(
        Buffer.from(validSig, 'utf8'),
        Buffer.from(tamperedSig, 'utf8')
      );

      return matches && rejected;
    },
  },
];

async function runTestSuite() {
  console.log('================================================================');
  console.log(' TUITIONOS: PARENT PORTAL MODULE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const ok = await t.fn();
      if (ok) {
        console.log(`  ✓ [PASS] ${t.name}`);
        passed++;
      } else {
        console.error(`  ✗ [FAIL] ${t.name}`);
        failed++;
      }
    } catch (e: any) {
      console.error(`  ✗ [ERROR] ${t.name} -> ${e.message}`);
      failed++;
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(` Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
