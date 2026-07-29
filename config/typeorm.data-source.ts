import { DataSource, DataSourceOptions } from 'typeorm';
import { createDatabaseCliOptions } from './database.config';
import { loadProjectEnvironmentFiles } from './environment-files';

// AI modified: TypeORM CLI now follows the same runtime-first dotenv precedence as Nest and Sentry bootstrap.
loadProjectEnvironmentFiles();
const databaseOptions = createDatabaseCliOptions();

export default new DataSource({
  type: databaseOptions.type,
  host: databaseOptions.host,
  port: databaseOptions.port,
  username: databaseOptions.username,
  password: databaseOptions.password,
  database: databaseOptions.database,
  synchronize: databaseOptions.synchronize,
  entities: databaseOptions.entities,
  migrations: databaseOptions.migrations,
} as DataSourceOptions);
