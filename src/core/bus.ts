import Sync from "heatsync";
import {
  Client as ClusterClient,
} from "discord-hybrid-sharding";
import { Client } from "discord.js";
import { PluginsModule, CommandsModule, DatabaseModule } from "@modules/exports";

export interface bus {
  moduleReloadLog: Map<string, string>;
  disabledCategories: string[];
  sync: Sync;
  database: DatabaseModule;
  plugins: PluginsModule;
  commands: CommandsModule;
  bot: Client;
  cluster: ClusterClient;
  loadedSyncFiles: string[];
  dependencies: Map<string, string[]>
}

declare global {
  var bus: bus;
}

export { };
