import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import type {
  Goal,
  GoalContribution,
  Paginated,
} from '@financehub/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

/**
 * HTTP surface for savings goals and their contributions. Every route is scoped
 * to the authenticated principal by the service layer.
 */
@ApiTags('Goals')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'List the authenticated user savings goals' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListGoalsQueryDto,
  ): Promise<Paginated<Goal>> {
    return this.goals.list(user.userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a savings goal' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGoalDto,
  ): Promise<Goal> {
    return this.goals.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a savings goal by id' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Goal> {
    return this.goals.get(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings goal' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<Goal> {
    return this.goals.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a savings goal' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.goals.remove(user.userId, id);
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'List recent contributions toward a goal' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listContributions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<GoalContribution[]> {
    return this.goals.listContributions(user.userId, id, limit);
  }

  @Post(':id/contributions')
  @ApiOperation({ summary: 'Record a contribution toward a goal' })
  addContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContributionDto,
  ): Promise<GoalContribution> {
    return this.goals.addContribution(user.userId, id, dto);
  }

  @Delete(':id/contributions/:contributionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contribution and reverse its effect' })
  removeContribution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
  ): Promise<void> {
    return this.goals.removeContribution(user.userId, id, contributionId);
  }
}
