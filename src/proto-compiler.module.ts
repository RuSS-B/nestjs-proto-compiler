import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ProtoCompilerOptions } from './interfaces';
import { ProtoCompilerService } from './proto-compiler.service';

@Module({})
export class ProtoCompilerModule {
  static register(options: ProtoCompilerOptions): DynamicModule {
    return {
      module: ProtoCompilerModule,
      providers: [
        Logger,
        {
          provide: 'PROTO_LOADER_OPTIONS',
          useValue: options,
        },
        ProtoCompilerService,
      ],
      exports: [ProtoCompilerService],
    };
  }
}
