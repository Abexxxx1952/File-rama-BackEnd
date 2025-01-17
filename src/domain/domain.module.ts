import { Module } from '@nestjs/common';
import { FilesSystemModule } from './filesSystem/filesSystem.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule, FilesSystemModule],
  controllers: [],
  providers: [],
})
export class DomainModule {}
