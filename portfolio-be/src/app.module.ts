import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
// Public modules
import { ProjectsModule } from './projects/projects.module';
import { SkillsModule } from './skills/skills.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { BlogModule } from './blog/blog.module';
import { SettingsModule } from './settings/settings.module';
import { ContactModule } from './contact/contact.module';
import { AnalyticsModule } from './analytics/analytics.module';
// Auth + admin support
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting (Req 13 — defaults overridden per-route on POST /contact)
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.CONTACT_RATE_TTL ?? 60_000),
        limit: Number(process.env.CONTACT_RATE_LIMIT ?? 100),
      },
    ]),

    // Serve uploaded files statically at /uploads/*
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),

    PrismaModule,

    // Domain modules
    ProjectsModule,
    SkillsModule,
    ExperiencesModule,
    BlogModule,
    SettingsModule,
    ContactModule,
    AnalyticsModule,
    AuthModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
