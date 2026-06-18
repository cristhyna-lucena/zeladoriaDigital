import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.department.findMany(); }
  create(data: CreateDepartmentDto) {
    const payload: Prisma.DepartmentCreateInput = { name: data.name };
    return this.prisma.department.create({ data: payload });
  }
  update(id: string, data: UpdateDepartmentDto) {
    const payload: Prisma.DepartmentUpdateInput = { name: data.name };
    return this.prisma.department.update({ where: { id }, data: payload });
  }
  remove(id: string) { return this.prisma.department.delete({ where: { id } }); }
}
