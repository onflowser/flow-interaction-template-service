import { BaseModel } from "./base";

class Template extends BaseModel {
  id!: string;
  json_string!: string;
  testnet_cadence_ast_sha3_256_hash!: string;
  mainnet_cadence_ast_sha3_256_hash!: string;
  // Hash of Cadence code with excluded import addresses (using the new import syntax).
  // https://github.com/onflow/flips/blob/main/application/20220323-contract-imports-syntax.md
  emulator_cadence_ast_sha3_256_hash!: string;

  static get tableName() {
    return "templates";
  }
}

export { Template };
