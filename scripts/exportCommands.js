const deleteCommands = process.argv.includes("delete");
const sendGlobalCommands = process.argv.includes("global");
const isAlpha = process.argv.includes("debug");
const axios = require("axios");
const fs = require("fs");
const util = require("util");
const Path = require("path");
process.env = require("../secretes.json");

function readDirR(dir) {
  return fs.statSync(dir).isDirectory()
    ? Array.prototype.concat(
        ...fs.readdirSync(dir).map((f) => readDirR(Path.join(dir, f)))
      )
    : dir;
}

const commandsPaths = deleteCommands
  ? []
  : readDirR(`${process.cwd()}/src/commands`);

process.chdir(`${process.cwd()}/src`);

const dataBus = require(`${process.cwd()}/dataBus.js`);

const Heatsync = require("heatsync");
const { options, proc } = require("node-os-utils");

const sync = new Heatsync();

Object.assign(dataBus, { sync: sync });

const utils = sync.require(`${process.cwd()}/utils`);

const commands = [];

const rawCommands = [];

commandsPaths.forEach((path) => {
  const command = require(path);
  commands.push(command);
});

utils.log(
  "Emulated dev enviroment and loaded raw commands, count :",
  commands.length
);

const editedCommands = commands.map(function (command) {
  const exportedCommand = {
    name: command.name,
    category: command.category,
    description: command.description,
    syntax: command.syntax,
    options: command.options,
  };

  return exportedCommand;
});

fs.writeFileSync(
  "commands.json",
  JSON.stringify({ commands: editedCommands }, null, 2)
);

utils.log("Exported commands count:", editedCommands.length);
