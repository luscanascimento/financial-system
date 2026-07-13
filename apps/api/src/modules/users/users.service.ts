import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@financehub/shared-types';

import { UpdateProfileDto } from './dto/update-profile.dto';
import { toAuthUser } from './mappers/user.mapper';
import { UsersRepository } from './users.repository';

/**
 * User-facing profile operations. Authentication/credential concerns live in
 * the Auth module; this service deals with the user's own profile data.
 */
@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toAuthUser(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    const existing = await this.users.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.users.update(userId, {
      displayName: dto.displayName ?? existing.displayName,
    });
    return toAuthUser(updated);
  }
}
