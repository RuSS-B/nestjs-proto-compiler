#!/usr/bin/env node
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { ProtoCompilerModule } from './proto-compiler.module';
import { ProtoCompilerService } from './proto-compiler.service';

async function bootstrap() {
  const program = new Command();

  program
    .name('nest-proto-load')
    .description('Load proto file from gRPC reflection')
    .requiredOption('-u, --url <url>', 'gRPC server URL')
    .option('-o, --output <directory>', 'Output directory', './proto')
    .action(async (options) => {
      try {
        const app = await NestFactory.createApplicationContext(
          ProtoCompilerModule.register({
            url: options.url,
            outputDir: options.output,
          }),
        );

        const service = app.get(ProtoCompilerService);
        await service.loadAndSaveProto();

        console.log('Proto file generated successfully!');
        await app.close();
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    });

  program.parse();
}

void bootstrap();
