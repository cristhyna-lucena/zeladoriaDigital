import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNeighborhoodDto } from './dto/create-neighborhood.dto';
import { UpdateNeighborhoodDto } from './dto/update-neighborhood.dto';
@Injectable()
export class NeighborhoodsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll(){ return this.prisma.neighborhood.findMany(); }
  create(data: CreateNeighborhoodDto) {
    const payload: Prisma.NeighborhoodCreateInput = { name: data.name };
    return this.prisma.neighborhood.create({ data: payload });
  }
  update(id: string, data: UpdateNeighborhoodDto) {
    const payload: Prisma.NeighborhoodUpdateInput = { name: data.name };
    return this.prisma.neighborhood.update({ where: { id }, data: payload });
  }
  remove(id: string) { return this.prisma.neighborhood.delete({ where: { id } }); }
}
