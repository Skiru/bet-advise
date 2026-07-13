import * as fs from 'fs';
import * as path from 'path';

describe('Architecture boundaries', () => {
  const srcDir = path.resolve(__dirname, '../../../src');

  function getAllFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath));
      } else if (file.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const allFiles = getAllFiles(srcDir);

  it('domain layer must not import NestJS, TypeORM, AWS SDK, ioredis, or express', () => {
    const domainFiles = allFiles.filter((f) => f.includes('/domain/'));
    const forbiddenImports = [
      '@nestjs/',
      'typeorm',
      '@aws-sdk/',
      'ioredis',
      'express',
    ];

    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const forbidden of forbiddenImports) {
        if (
          content.includes(`from '${forbidden}'`) ||
          content.includes(`import '${forbidden}'`) ||
          content.includes(`require('${forbidden}')`)
        ) {
          throw new Error(
            `Architecture violation: Domain file ${file} imports forbidden library "${forbidden}"`,
          );
        }
      }
    }
  });

  it('controllers must not import TypeORM Repository directly', () => {
    const controllerFiles = allFiles.filter((f) =>
      f.endsWith('.controller.ts'),
    );
    for (const file of controllerFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('Repository<') && content.includes('typeorm')) {
        throw new Error(
          `Architecture violation: Controller file ${file} imports TypeORM Repository directly instead of using Application Ports/Mappers`,
        );
      }
    }
  });
});
