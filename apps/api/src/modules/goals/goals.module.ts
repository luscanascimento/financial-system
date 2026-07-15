import { Module } from '@nestjs/common';

import { GoalsController } from './goals.controller';
import { GoalsRepository } from './goals.repository';
import { GoalsService } from './goals.service';

/** Wires the savings-goals feature: controller, service and repository. */
@Module({
  controllers: [GoalsController],
  providers: [GoalsService, GoalsRepository],
  exports: [GoalsService, GoalsRepository],
})
export class GoalsModule {}
