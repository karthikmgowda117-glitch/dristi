import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { JwtAuthGuard, JurisdictionGuard, RolesGuard, JwtStrategy } from '@drishti/auth-guard';
import { AuditInterceptor } from '@drishti/common';
import { AllExceptionsFilter } from '@drishti/common';
import { CaseController } from './case/case.controller';
import { CaseService } from './case/case.service';
import { TimelineController } from './timeline/timeline.controller';
import { TimelineService } from './timeline/timeline.service';
import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { ActSectionController } from './act-section/act-section.controller';
import { ActSectionService } from './act-section/act-section.service';
import {
  CasemasterEntity,
  CaseTimelineEventEntity,
  TaskEntity,
  ActSectionAssociationEntity,
  UnitEntity,
  UserEntity,
  CrimeMajorHeadEntity,
  CrimeMinorHeadEntity,
  ActMasterEntity,
  SectionMasterEntity,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [
          CasemasterEntity, CaseTimelineEventEntity, TaskEntity,
          ActSectionAssociationEntity, UnitEntity, UserEntity,
          CrimeMajorHeadEntity, CrimeMinorHeadEntity, ActMasterEntity, SectionMasterEntity,
        ],
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      CasemasterEntity, CaseTimelineEventEntity, TaskEntity,
      ActSectionAssociationEntity, UnitEntity, UserEntity,
      CrimeMajorHeadEntity, CrimeMinorHeadEntity, ActMasterEntity, SectionMasterEntity,
    ]),
  ],
  controllers: [CaseController, TimelineController, TaskController, ActSectionController],
  providers: [
    CaseService, TimelineService, TaskService, ActSectionService, JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: JurisdictionGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
