import * as fs from 'fs';
import * as path from 'path';

// Function to recursively find schema files
function findSchemaFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search in subdirectories
      findSchemaFiles(filePath, fileList);
    } else if (file.match(/\.schema\.(js|ts)$/)) {
      // If the file matches the pattern, add it to the list
      fileList.push(filePath);
    }
  });

  return fileList;
}

type DatabaseSchema = Record<string, any>;
export async function loadDatabaseSchema(): Promise<DatabaseSchema> {
  // Start searching from the src folder
  const srcDir = path.join(__dirname, '../'); // src/database -> src
  const schemaFiles = findSchemaFiles(srcDir);

  // Dynamically import all schema files
  const schemaImports = schemaFiles.map((file) => import(file));

  // Combine all schemas into a single object
  let databaseSchema: DatabaseSchema = {};

  Promise.all(schemaImports).then((schemas) => {
    schemas.forEach((schemaModule) => {
      // Merge all named exports from the module
      Object.assign(databaseSchema, schemaModule);
    });
  });

  return databaseSchema;
}
