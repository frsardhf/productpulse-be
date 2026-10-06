import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CartService } from '../src/cart/cart.service';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma.service';

const checkoutAddress = '123 Integration Street, Jakarta';

describe('PostgreSQL checkout integration', () => {
  const prisma = new PrismaService();
  const cartService = new CartService(prisma);
  const ordersService = new OrdersService(prisma);

  beforeAll(async () => {
    const databaseUrl = new URL(process.env.POSTGRES_PRISMA_URL ?? '');
    if (databaseUrl.pathname !== '/productpulse_integration') {
      throw new Error(
        'Integration tests require the dedicated productpulse_integration database',
      );
    }
    await prisma.$connect();
  });

  beforeEach(async () => {
    await dropFailureTrigger();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await dropFailureTrigger();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps concurrent adds in one cart row without losing quantity', async () => {
    const { user, product } = await createFixture({ stock: 3 });

    await Promise.all([
      cartService.addCartItem(user.id, product.id, 1),
      cartService.addCartItem(user.id, product.id, 1),
    ]);

    const rows = await prisma.cartItem.findMany({
      where: { userId: user.id, productId: product.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(2);

    await expect(
      cartService.addCartItem(user.id, product.id, 2),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces cart uniqueness and positive quantities in PostgreSQL', async () => {
    const { user, product } = await createFixture({ stock: 3 });
    await prisma.cartItem.create({
      data: { userId: user.id, productId: product.id, quantity: 1 },
    });

    await expect(
      prisma.cartItem.create({
        data: { userId: user.id, productId: product.id, quantity: 1 },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await prisma.cartItem.deleteMany();
    await expect(
      prisma.cartItem.create({
        data: { userId: user.id, productId: product.id, quantity: 0 },
      }),
    ).rejects.toThrow();
  });

  it('returns one order and decrements stock once for repeated checkout', async () => {
    const { user, product } = await createFixture({ stock: 2 });
    await prisma.cartItem.create({
      data: { userId: user.id, productId: product.id, quantity: 1 },
    });
    const checkout = {
      shippingAddress: checkoutAddress,
      idempotencyKey: '2c83869c-804e-4bb5-a0fe-43d71deec96d',
    };

    const first = await ordersService.checkout(user.id, checkout);
    const repeated = await ordersService.checkout(user.id, checkout);

    expect(repeated.id).toBe(first.id);
    await expectDatabaseState({
      productId: product.id,
      expectedStock: 1,
      expectedOrders: 1,
    });
    await expect(
      prisma.cartItem.count({ where: { userId: user.id } }),
    ).resolves.toBe(0);
  });

  it('coalesces simultaneous checkout requests with the same key', async () => {
    const { user, product } = await createFixture({ stock: 2 });
    await prisma.cartItem.create({
      data: { userId: user.id, productId: product.id, quantity: 1 },
    });
    const checkout = {
      shippingAddress: checkoutAddress,
      idempotencyKey: '2194b3ef-34ce-42f1-8e03-3882018f013d',
    };

    const [first, second] = await Promise.all([
      ordersService.checkout(user.id, checkout),
      ordersService.checkout(user.id, checkout),
    ]);

    expect(second.id).toBe(first.id);
    await expectDatabaseState({
      productId: product.id,
      expectedStock: 1,
      expectedOrders: 1,
    });
  });

  it('allows only one competing checkout to claim the last unit', async () => {
    const { user, product } = await createFixture({ stock: 1 });
    const secondUser = await prisma.user.create({
      data: {
        name: 'Second User',
        email: 'second@example.com',
        password: 'not-used-in-integration-tests',
      },
    });
    await prisma.cartItem.createMany({
      data: [
        { userId: user.id, productId: product.id, quantity: 1 },
        { userId: secondUser.id, productId: product.id, quantity: 1 },
      ],
    });

    const results = await Promise.allSettled([
      ordersService.checkout(user.id, {
        shippingAddress: checkoutAddress,
        idempotencyKey: '099b3cd7-26c6-4353-947a-5a4798d94bc5',
      }),
      ordersService.checkout(secondUser.id, {
        shippingAddress: checkoutAddress,
        idempotencyKey: '35af6f3d-6b37-4bda-befd-65bfcab54e6b',
      }),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: expect.any(ConflictException) });
    await expectDatabaseState({
      productId: product.id,
      expectedStock: 0,
      expectedOrders: 1,
    });
    await expect(prisma.cartItem.count()).resolves.toBe(1);
  });

  it('rolls back stock and preserves the cart when order insertion fails', async () => {
    const { user, product } = await createFixture({ stock: 2 });
    await prisma.cartItem.create({
      data: { userId: user.id, productId: product.id, quantity: 1 },
    });
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION reject_order_insert() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'simulated order write failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "reject_order_insert"
      BEFORE INSERT ON "Order"
      FOR EACH ROW EXECUTE FUNCTION reject_order_insert()
    `);

    await expect(
      ordersService.checkout(user.id, {
        shippingAddress: checkoutAddress,
        idempotencyKey: 'ee702f27-cd20-472f-8269-d31badb37e4c',
      }),
    ).rejects.toThrow();

    await expectDatabaseState({
      productId: product.id,
      expectedStock: 2,
      expectedOrders: 0,
    });
    await expect(
      prisma.cartItem.count({ where: { userId: user.id } }),
    ).resolves.toBe(1);
  });

  async function createFixture({ stock }: { stock: number }) {
    const user = await prisma.user.create({
      data: {
        name: 'Integration User',
        email: 'integration@example.com',
        password: 'not-used-in-integration-tests',
      },
    });
    const category = await prisma.category.create({
      data: { name: 'Integration Category' },
    });
    const product = await prisma.product.create({
      data: {
        name: 'Integration Product',
        description: 'Product used by database integration tests',
        price: new Prisma.Decimal('12.50'),
        stock,
        categoryId: category.id,
      },
    });
    return { user, product };
  }

  async function expectDatabaseState({
    productId,
    expectedStock,
    expectedOrders,
  }: {
    productId: number;
    expectedStock: number;
    expectedOrders: number;
  }) {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.stock).toBe(expectedStock);
    await expect(prisma.order.count()).resolves.toBe(expectedOrders);
  }

  async function dropFailureTrigger() {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS "reject_order_insert" ON "Order"',
    );
    await prisma.$executeRawUnsafe(
      'DROP FUNCTION IF EXISTS reject_order_insert()',
    );
  }
});
