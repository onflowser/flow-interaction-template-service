import { knex } from "knex";
import { Model } from "objection";

const initDB = (config, options: {
    database: "postgresql" | "sqlite3"
}) => {
  // Use a Postgres DB in production.
  const DBConfig =
    options.database === "postgresql"
      ? {
          client: "postgresql",
          connection: {
            connectionString: config.databaseUrl,
            ssl:
              process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false,
          },
          migrations: {
            directory: config.databaseMigrationPath,
          },
        }
      : {
          client: "sqlite3",
          useNullAsDefault: true,
          connection: {
            filename: "./" + config.dbPath,
          },
          migrations: {
            directory: config.databaseMigrationPath,
          },
        };

  const knexInstance = knex(DBConfig);

  Model.knex(knexInstance);

  return knexInstance;
};

export default initDB;
