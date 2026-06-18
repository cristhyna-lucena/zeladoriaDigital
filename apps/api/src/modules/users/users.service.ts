import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessScopeService } from '../access/access-scope.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const DEPARTMENT_MANAGED_ROLES: UserRole[] = [UserRole.SECRETARIA, UserRole.EQUIPE_CAMPO];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { department: { select: { id: true, name: true } } }
    });
  }

  async create(data: CreateUserDto) {
    const payload: Prisma.UserCreateInput = {
      name: data.name,
      email: data.email,
      password: await bcrypt.hash(data.password, 10),
      role: data.role as UserRole,
      department: data.departmentId ? { connect: { id: data.departmentId } } : undefined,
      municipality: data.municipalityId ? { connect: { id: data.municipalityId } } : undefined
    };
    return this.prisma.user.create({
      data: payload,
      include: { department: { select: { id: true, name: true } } }
    });
  }

  async createForDepartmentAdmin(data: CreateUserDto, actor: { sub: string; role: UserRole }) {
    const departmentId = await this.requireActorDepartment(actor);
    if (!DEPARTMENT_MANAGED_ROLES.includes(data.role as UserRole)) {
      throw new BadRequestException('Admin secretaria só pode cadastrar usuários da própria unidade.');
    }

    return this.create({
      ...data,
      departmentId
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
  }

  async findAllForUser(user: { sub: string; role: UserRole }) {
    const scope = await this.accessScope.userScopeForUser(user);
    return this.prisma.user.findMany({
      where: scope,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
  }

  async update(id: string, data: UpdateUserDto) {
    const payload: Prisma.UserUpdateInput = {
      name: data.name,
      email: data.email,
      role: data.role ? (data.role as UserRole) : undefined,
      department: data.departmentId ? { connect: { id: data.departmentId } } : data.departmentId === null ? { disconnect: true } : undefined
    };
    if (data.password) {
      payload.password = await bcrypt.hash(data.password, 10);
    }
    if (data.role && !['SECRETARIA', 'EQUIPE_CAMPO'].includes(data.role)) {
      payload.department = { disconnect: true };
    }
    return this.prisma.user.update({
      where: { id },
      data: payload,
      include: { department: { select: { id: true, name: true } } }
    });
  }

  async updateForDepartmentAdmin(
    id: string,
    data: UpdateUserDto,
    actor: { sub: string; role: UserRole }
  ) {
    const departmentId = await this.requireActorDepartment(actor);
    const target = await this.requireManageableDepartmentUser(id, departmentId, actor.sub);

    if (data.role && !DEPARTMENT_MANAGED_ROLES.includes(data.role as UserRole)) {
      throw new BadRequestException('Admin secretaria não pode atribuir este perfil.');
    }

    return this.update(id, {
      ...data,
      departmentId
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async removeForDepartmentAdmin(id: string, actor: { sub: string; role: UserRole }) {
    const departmentId = await this.requireActorDepartment(actor);
    await this.requireManageableDepartmentUser(id, departmentId, actor.sub);

    if (id === actor.sub) {
      throw new BadRequestException('Você não pode remover o próprio usuário.');
    }

    return this.remove(id);
  }

  private async requireActorDepartment(actor: { sub: string; role: UserRole }) {
    if (actor.role !== UserRole.SECRETARIA) {
      throw new ForbiddenException('Apenas admin secretaria pode gerenciar usuários da unidade.');
    }

    const departmentId = await this.accessScope.getUserDepartmentId(actor.sub);
    if (!departmentId) {
      throw new BadRequestException('Seu usuário não está vinculado a uma secretaria.');
    }

    return departmentId;
  }

  private async requireManageableDepartmentUser(
    targetUserId: string,
    departmentId: string,
    actorId: string
  ) {
    const target = await this.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (target.departmentId !== departmentId) {
      throw new ForbiddenException('Este usuário não pertence à sua secretaria.');
    }

    if (!DEPARTMENT_MANAGED_ROLES.includes(target.role)) {
      throw new ForbiddenException('Você não pode alterar usuários deste perfil.');
    }

    return target;
  }
}
