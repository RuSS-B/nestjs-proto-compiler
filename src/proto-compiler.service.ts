import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProtoCompilerOptions } from './interfaces';
import { ChannelCredentials } from '@grpc/grpc-js';
import { GrpcReflection } from 'grpc-js-reflection-client';
import { FileDescriptorProto } from 'google-protobuf/google/protobuf/descriptor_pb';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { ProtoFile } from './proto-file';

@Injectable()
export class ProtoCompilerService {
  private reflectionClient: GrpcReflection;

  private processedProtoFiles = new Set<string>();

  constructor(
    @Inject('PROTO_LOADER_OPTIONS')
    private readonly options: ProtoCompilerOptions,
    private readonly logger: Logger,
  ) {
    this.reflectionClient = new GrpcReflection(options.url, ChannelCredentials.createInsecure());
  }

  async loadAndSaveProto() {
    await this.loadReflection();
  }

  async loadReflection() {
    const services = await this.reflectionClient.listServices();

    // let descriptor;
    for (const service of services) {
      const methods = await this.reflectionClient.listMethods(service);

      for (const method of methods) {
        const def = method.definition;

        const fileDescriptors = def['requestType']['fileDescriptorProtos'];

        for (const fileDescriptor of fileDescriptors) {
          const deserialized = FileDescriptorProto.deserializeBinary(fileDescriptor);

          // Skip google protobuf files
          if (deserialized.getPackage() === 'google.protobuf') {
            continue;
          }

          const protoFile = new ProtoFile(deserialized);

          if (!this.processedProtoFiles.has(protoFile.getHash())) {
            await this.writeFile(deserialized.getName(), protoFile.getContent());
            this.processedProtoFiles.add(protoFile.getHash());
          }
        }
      }
    }
  }

  async writeFile(fileName: string, protoContent: string) {
    try {
      await mkdir(this.options.outputDir, { recursive: true });
      await writeFile(resolve(this.options.outputDir, `${fileName}`), protoContent);

      this.logger.debug(`Saving ${fileName}`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
