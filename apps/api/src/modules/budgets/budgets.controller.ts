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
import type { BudgetProgress } from '@financehub/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the authenticated user budgets with progress',
  })
  list(@CurrentUser() user: AuthenticatedUser): Promise<BudgetProgress[]> {
    return this.budgets.list(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a budget' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetProgress> {
    return this.budgets.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single budget with progress' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BudgetProgress> {
    return this.budgets.get(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetProgress> {
    return this.budgets.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.budgets.delete(user.userId, id);
  }
}
