import { DataSource, DataSourceOptions } from 'typeorm';
import { createDatabaseCliOptions } from './database.config';

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
