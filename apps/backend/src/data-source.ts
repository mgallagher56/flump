import "reflect-metadata";
import { DataSource, type DataSourceOptions } from "typeorm";
import { typeOrmOptionsFromEnv } from "./config/typeorm.options";

// TypeORM CLI data source (migration:run / revert / generate). Same options as the app.
export default new DataSource(typeOrmOptionsFromEnv(process.env) as DataSourceOptions);
