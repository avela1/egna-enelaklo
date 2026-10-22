import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module';
import { ProhibitedItemsController } from './prohibited-items.controller';
import { ProhibitedService } from './prohibited.service';
import { TaskStateMachine } from './task-state-machine.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AddressesModule],
  controllers: [TasksController, ProhibitedItemsController],
  providers: [TasksService, TaskStateMachine, ProhibitedService],
  exports: [TasksService, TaskStateMachine],
})
export class TasksModule {}
