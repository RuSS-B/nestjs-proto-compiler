# Proto Reflection Generator

A NestJS-based tool for generating `.proto` files from gRPC reflection data. The tool connects to a gRPC server, fetches service definitions via reflection, and generates corresponding proto files.

## Features

- Generates `.proto` files from gRPC reflection data
- Handles cross-package dependencies and imports
- Properly formats service definitions and messages
- Skips well-known Google protobuf types
- Prevents duplicate file generation using content hashing
- Built-in logging for debugging and tracking progress

## Installation

```bash
npm install nestjs-proto-compiler
```


## Usage

### As a NestJS Module

```
import { ProtoLoaderModule } from 'nestjs-proto-compiler';

@Module({
  imports: [
    ProtoLoaderModule.register({
      url: 'localhost:50051',
      outputDir: './proto'
    }),
  ],
})
export class AppModule {}
```

### Using CLI

```bash
npx proto-loader --url localhost:50051 --output ./proto
```

### CLI Options

- --url (-u): gRPC server URL (required)
- --output (-o): Output directory for proto files (default: './proto')
- --verbose (-v): Enable verbose logging
