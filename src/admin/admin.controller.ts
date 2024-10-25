// admin.controller.ts

import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { Role } from '@prisma/client';

@Controller('admin/users')
@UseGuards(AuthGuard('jwt')) // Ensure only authenticated admins can access
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  async addProduct(@Body() createProductDto: CreateProductDto) {
    return this.adminService.addProduct(createProductDto);
  }

  @Get()
  async getAllProducts() {
    return this.adminService.getAllProducts();
  }

  @Get(':id')
  async getProduct(@Param('id') id: number) {
    return this.adminService.getProduct(id);
  }

  @Get()
  async getAllOrders() {
    return this.adminService.getAllOrders();
  }

  @Put(':id/status')
  async updateOrderStatus(@Param('id') id: number, @Body() status: OrderStatus) {
    return this.adminService.updateOrderStatus(id, status);
  }

  @Put(':id')
  async updateProduct(@Param('id') id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.adminService.updateProduct(id, updateProductDto);
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: number) {
    return this.adminService.deleteProduct(id);
  }

  @Get()
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Put(':id/role')
  async promoteUser(@Param('id') id: number, @Body('role') role: string) {
  // Validate the role string
  if (!Object.values(Role).includes(role.toUpperCase() as Role)) {
    throw new BadRequestException('Invalid role specified.');
  }

  const roleEnum = role.toUpperCase() as Role;
  return this.adminService.promoteUser(id, roleEnum);
  }
}
