import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CheckoutDto } from './checkout.dto';

describe('CheckoutDto', () => {
  it('accepts a UUID idempotency key and trims the shipping address', async () => {
    const input = plainToInstance(CheckoutDto, {
      shippingAddress: '  123 Main Street, Jakarta  ',
      idempotencyKey: '7ca1d688-83d4-4ac2-a71a-6cbe35b20d9f',
    });

    await expect(validate(input)).resolves.toHaveLength(0);
    expect(input.shippingAddress).toBe('123 Main Street, Jakarta');
  });

  it('rejects a short address and invalid idempotency key', async () => {
    const input = plainToInstance(CheckoutDto, {
      shippingAddress: 'short',
      idempotencyKey: 'retry-me',
    });

    const errors = await validate(input);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['shippingAddress', 'idempotencyKey']),
    );
  });
});
