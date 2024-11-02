import {
  DescriptorProto,
  FieldDescriptorProto,
  FileDescriptorProto,
  ServiceDescriptorProto,
} from 'google-protobuf/google/protobuf/descriptor_pb';
import { createHash } from 'crypto';

const wellKnownTypes: Record<string, string> = {
  'google.protobuf.Timestamp': 'import "google/protobuf/timestamp.proto"',
  'google.protobuf.Duration': 'import "google/protobuf/duration.proto"',
  'google.protobuf.Any': 'import "google/protobuf/any.proto"',
  'google.protobuf.Empty': 'import "google/protobuf/empty.proto"',
  'google.protobuf.FieldMask': 'import "google/protobuf/field_mask.proto"',
  'google.protobuf.Struct': 'import "google/protobuf/struct.proto"',
  'google.protobuf.Value': 'import "google/protobuf/struct.proto"',
  'google.protobuf.ListValue': 'import "google/protobuf/struct.proto"',
  'google.protobuf.NullValue': 'import "google/protobuf/struct.proto"',
  'google.protobuf.DoubleValue': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.FloatValue': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.Int64Value': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.UInt64Value': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.Int32Value': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.UInt32Value': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.BoolValue': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.StringValue': 'import "google/protobuf/wrappers.proto"',
  'google.protobuf.BytesValue': 'import "google/protobuf/wrappers.proto"',
};

export class ProtoFile {
  private readonly packageName: string;

  constructor(private readonly descriptor: FileDescriptorProto) {
    this.packageName = this.descriptor.getPackage();
  }

  getName(): string {
    return this.descriptor.getPackage();
  }

  getHash() {
    return createHash('md5').update(JSON.stringify(this.descriptor.toObject())).digest('hex');
  }

  getContent(): string {
    let protoFileContent = `syntax = "proto3";\n\n`;

    if (this.descriptor.getPackage()) {
      protoFileContent += `package ${this.descriptor.getPackage()};\n\n`;
    }

    protoFileContent += this.generateImports();
    protoFileContent += this.generateServices();
    protoFileContent += this.generateMessages();

    return protoFileContent;
  }

  private generateImports(): string {
    const imports = new Set<string>();

    const dependencyList = this.descriptor.getDependencyList();
    dependencyList.forEach((dependency) => {
      imports.add(`import "${dependency}"`);
    });

    this.descriptor.getMessageTypeList().forEach((message: DescriptorProto) => {
      message.getFieldList().forEach((field) => {
        const typeName = field.getTypeName();
        if (typeName && typeName.includes('.')) {
          this.addExternalTypeImport(typeName, imports);
        }
      });
    });

    this.descriptor.getServiceList().forEach((service) => {
      service.getMethodList().forEach((method) => {
        this.addExternalTypeImport(method.getInputType(), imports);
        this.addExternalTypeImport(method.getOutputType(), imports);
      });
    });

    const sortedImports = Array.from(imports).sort();
    return sortedImports.length > 0 ? sortedImports.join(';\n') + ';\n\n' : '';
  }

  private addExternalTypeImport(type: string, imports: Set<string>): void {
    const normalizedType = type.startsWith('.') ? type : `.${type}`;
    if (normalizedType.startsWith('.') && !normalizedType.startsWith(`.${this.packageName}`)) {
      const importPath = this.resolveImportPath(normalizedType);
      if (importPath) {
        imports.add(importPath);
      }
    }
  }

  private resolveImportPath(fullTypeName: string): string {
    const typeName = fullTypeName.startsWith('.') ? fullTypeName.substring(1) : fullTypeName;

    const wellKnownType = wellKnownTypes[typeName];
    if (wellKnownType) {
      return wellKnownType;
    }

    const [packageName] = typeName.split('.');

    return `import "${packageName}.proto"`;
  }

  private generateServices(): string {
    let protoFileContent = '';
    this.descriptor.getServiceList().forEach((service) => {
      protoFileContent += this.generateService(service);
    });

    return protoFileContent;
  }

  private generateService(service: ServiceDescriptorProto): string {
    let serviceContent = `service ${service.getName()} {\n`;

    service.getMethodList().forEach((method: any) => {
      const inputType = this.cleanTypeName(method.getInputType());
      const outputType = this.cleanTypeName(method.getOutputType());

      serviceContent += `  rpc ${method.getName()}(${inputType}) returns (${outputType});\n`;
    });

    serviceContent += `}\n\n`;

    return serviceContent;
  }

  private cleanTypeName(fullTypeName: string): string {
    // Remove leading dot if exists
    const typeName = fullTypeName.startsWith('.') ? fullTypeName.substring(1) : fullTypeName;

    // If it's from the same package, remove the package prefix
    if (typeName.startsWith(`${this.packageName}.`)) {
      return typeName.substring(this.packageName.length + 1);
    }

    return typeName;
  }

  private generateMessages(): string {
    let protoFileContent = '';
    this.descriptor.getMessageTypeList().forEach((message: DescriptorProto) => {
      protoFileContent += this.generateMessage(message);
    });

    return protoFileContent;
  }

  private generateMessage(message: DescriptorProto): string {
    let messageContent = `message ${message.getName()} {\n`;

    message.getFieldList().forEach((field) => {
      const fieldType = this.getFieldType(field, message);
      const fieldName = this.toSnakeCase(field.getName());

      let fieldLabel = '';
      if (field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED && !fieldType.startsWith('map<')) {
        fieldLabel = 'repeated ';
      } else if (field.hasOneofIndex()) {
        fieldLabel = 'optional ';
      }

      messageContent += `  ${fieldLabel}${fieldType} ${fieldName} = ${field.getNumber()};\n`;
    });

    messageContent += `}\n\n`;

    return messageContent;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  private getFieldType(field: FieldDescriptorProto, message: DescriptorProto): string {
    const scalarTypes = {
      [FieldDescriptorProto.Type.TYPE_DOUBLE]: 'double',
      [FieldDescriptorProto.Type.TYPE_FLOAT]: 'float',
      [FieldDescriptorProto.Type.TYPE_INT64]: 'int64',
      [FieldDescriptorProto.Type.TYPE_UINT64]: 'uint64',
      [FieldDescriptorProto.Type.TYPE_INT32]: 'int32',
      [FieldDescriptorProto.Type.TYPE_FIXED64]: 'fixed64',
      [FieldDescriptorProto.Type.TYPE_FIXED32]: 'fixed32',
      [FieldDescriptorProto.Type.TYPE_BOOL]: 'bool',
      [FieldDescriptorProto.Type.TYPE_STRING]: 'string',
      [FieldDescriptorProto.Type.TYPE_BYTES]: 'bytes',
      [FieldDescriptorProto.Type.TYPE_UINT32]: 'uint32',
      [FieldDescriptorProto.Type.TYPE_SFIXED32]: 'sfixed32',
      [FieldDescriptorProto.Type.TYPE_SFIXED64]: 'sfixed64',
      [FieldDescriptorProto.Type.TYPE_SINT32]: 'sint32',
      [FieldDescriptorProto.Type.TYPE_SINT64]: 'sint64',
    };

    if (field.getType() in scalarTypes) {
      return scalarTypes[field.getType()];
    }

    if (field.getType() === FieldDescriptorProto.Type.TYPE_MESSAGE) {
      const typeName = field.getTypeName();
      const mapEntry = message
        .getNestedTypeList()
        .find((nestedType) => nestedType.getName() === typeName && nestedType.getOptions().getMapEntry());
      if (mapEntry) {
        const keyType = this.getFieldType(mapEntry.getFieldList()[0], message);
        const valueType = this.getFieldType(mapEntry.getFieldList()[1], message);
        return `map<${keyType}, ${valueType}>`;
      }
    }

    return field.getTypeName() || 'unknown';
  }
}
