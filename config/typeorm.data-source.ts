import { DataSource, DataSourceOptions } from 'typeorm';
import { createDatabaseCliOptions } from './database.config';

const databaseOptions = createDatabaseCliOptions();

// CN: TypeORM CLI 数据源用于迁移生成和执行；EN: TypeORM CLI data source drives migrations.
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
