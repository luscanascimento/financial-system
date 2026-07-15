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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  Paginated,
  Transaction as TransactionDto,
} from '@financehub/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions with filters and pagination' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTransactionsDto,
  ): Promise<Paginated<TransactionDto>> {
    return this.transactions.list(user.userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Record a transaction (or an installment plan)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    return this.transactions.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one transaction by id' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionDto> {
    return this.transactions.get(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionDto> {
    return this.transactions.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction (and its installment legs)' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.transactions.delete(user.userId, id);
  }
}
