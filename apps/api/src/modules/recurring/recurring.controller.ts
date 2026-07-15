import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RecurringTransaction as RecurringDto } from '@financehub/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { RecurringService, type RunDueResult } from './recurring.service';

@ApiTags('Recurring Transactions')
@ApiBearerAuth()
@Controller('recurring-transactions')
export class RecurringController {
  constructor(private readonly recurring: RecurringService) {}

  @Get()
  @ApiOperation({ summary: 'List recurring-transaction templates' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<RecurringDto[]> {
    return this.recurring.list(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a recurring-transaction template' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecurringDto,
  ): Promise<RecurringDto> {
    return this.recurring.create(user.userId, dto);
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate transactions for the user due templates' })
  run(@CurrentUser() user: AuthenticatedUser): Promise<RunDueResult> {
    return this.recurring.runDue(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one recurring template by id' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringDto> {
    return this.recurring.get(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring template' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringDto,
  ): Promise<RecurringDto> {
    return this.recurring.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recurring template' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.recurring.delete(user.userId, id);
  }
}
