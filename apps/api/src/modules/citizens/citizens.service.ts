import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateCitizenDto } from './dto/create-citizen.dto';
import { UpdateCitizenDto } from './dto/update-citizen.dto';

@Injectable()
export class CitizensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCitizenDto) {
    const payload: Prisma.CitizenCreateInput = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      password: data.password ? await bcrypt.hash(data.password, 10) : undefined,
      municipality: data.municipalityId ? { connect: { id: data.municipalityId } } : undefined
    };
    return this.prisma.citizen.create({ data: payload });
  }

  findByEmail(email: string) {
    return this.prisma.citizen.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.citizen.findUnique({ where: { id } });
  }

  findAll() {
    return this.prisma.citizen.findMany();
  }

  async update(id: string, data: UpdateCitizenDto) {
    const payload: Prisma.CitizenUpdateInput = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      password: data.password ? await bcrypt.hash(data.password, 10) : undefined
    };
    return this.prisma.citizen.update({ where: { id }, data: payload });
  }

  remove(id: string) {
    return this.prisma.citizen.delete({ where: { id } });
  }
}
