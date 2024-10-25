// admin.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async addProduct(createProductDto: CreateProductDto) {
    return this.prisma.product.create({ data: createProductDto });
  }

  async getAllProducts() {
    return this.prisma.product.findMany();
  }

  async getProduct(id: number) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async getAllOrders() {
    return this.prisma.order.findMany({ include: { orderItems: true } });
  }
  
  async updateOrderStatus(id: number, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async updateProduct(id: number, updateProductDto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async deleteProduct(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }

  async getAllUsers() {
    return this.prisma.user.findMany();
  }
  
  async promoteUser(id: number, role: Role) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }
}
