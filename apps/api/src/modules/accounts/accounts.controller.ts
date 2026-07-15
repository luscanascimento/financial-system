import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Account as AccountDto } from '@financehub/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated user accounts' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<AccountDto[]> {
    return this.accounts.list(user.userId, includeArchived === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Open a new account' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountDto> {
    return this.accounts.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one account by id' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccountDto> {
    return this.accounts.get(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountDto> {
    return this.accounts.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive an account' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccountDto> {
    return this.accounts.archive(user.userId, id);
  }
}
