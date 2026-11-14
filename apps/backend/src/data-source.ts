import "./config/timezone";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { cliDataSourceOptions } from "./data-source.options";

// TypeORM CLI data source (migration:run / revert / generate). Same options as the app,
// but never auto-runs migrations (see data-source.options.ts).
export default new DataSource(cliDataSourceOptions(process.env));
