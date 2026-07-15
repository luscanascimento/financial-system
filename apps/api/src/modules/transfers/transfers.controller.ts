import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  Paginated,
  Transfer as TransferDto,
} from '@financehub/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { QueryTransfersDto } from './dto/query-transfers.dto';
import { TransfersService } from './transfers.service';

@ApiTags('Transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  @ApiOperation({ summary: 'List transfers with filters and pagination' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTransfersDto,
  ): Promise<Paginated<TransferDto>> {
    return this.transfers.list(user.userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Move money between two of the user accounts' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferDto> {
    return this.transfers.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one transfer by id' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransferDto> {
    return this.transfers.get(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transfer and reverse both legs' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.transfers.delete(user.userId, id);
  }
}
