import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.category.findMany(); }
  create(data: CreateCategoryDto) {
    const payload: Prisma.CategoryCreateInput = {
      name: data.name,
      description: data.description
    };
    return this.prisma.category.create({ data: payload });
  }
  update(id: string, data: UpdateCategoryDto) {
    const payload: Prisma.CategoryUpdateInput = {
      name: data.name,
      description: data.description
    };
    return this.prisma.category.update({ where: { id }, data: payload });
  }
  remove(id: string) { return this.prisma.category.delete({ where: { id } }); }
}
