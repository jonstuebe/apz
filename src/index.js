import inquirer from "inquirer";
import Promise from "bluebird";
import ora from "ora";
import clear from "clear";
import program from "commander";
import fs from "fs";

import pkg from "../package.json";
import {
  caskSearch,
  caskInstall,
  masSearch,
  masInstall,
  numApps
} from "./utils";
import chalk from "chalk";

const homedir = require("os").homedir();
const appsConfigPath = `${homedir}/apps.json`;
let apps = require(appsConfigPath);

program
  .command("install")
  .description("Install all applications from the global config ~/apps.json")
  .action(() => {
    clear();
    if (apps.mas) {
      Promise.map(apps.mas, app => {
        const spinner = new ora(`installing ${app.name}`).start();
        return masInstall(app)
          .then(() => {
            spinner.succeed(app.name);
          })
          .catch(() => {
            spinner.fail(app.name);
          });
      });
    }

    if (apps.cask) {
      Promise.map(
        apps.cask,
        app => {
          const spinner = new ora(`installing ${app}`).start();
          return caskInstall(app)
            .then(() => {
              spinner.succeed(app);
            })
            .catch(() => {
              spinner.fail(app);
            });
        },
        { concurrency: 1 }
      );
    }
  });

program
  .command("add")
  .description("Add an application to the global config as well as install it.")
  .action(() => {
    inquirer
      .prompt([
        {
          type: "list",
          name: "source",
          message: "Which location should this app be installed from?",
          choices: [
            { name: "Cask", value: "cask" },
            {
              name: "Mac App Store",
              value: "mas"
            }
          ]
        },
        {
          type: "input",
          name: "appName",
          message: "Enter the name of the app you would like to install:"
        },
        {
          type: "list",
          name: "appChosen",
          message: "Please select the app to install:",
          choices: async ({ source, appName }) => {
            let apps;
            switch (source) {
              case "cask":
                apps = await caskSearch(appName);
                break;
              case "mas":
                apps = await masSearch(appName);
                break;
            }
            return apps;
          }
        }
      ])
      .then(async results => {
        switch (results.source) {
          case "cask":
            if (!apps.cask) {
              apps.cask = [];
            }

            await caskInstall(results.appChosen);
            apps.cask.push(results.appChosen);
            apps.cask.sort();
            break;
          case "mas":
            if (!apps.mas) {
              apps.mas = [];
            }

            await masInstall(results.appChosen);
            apps.mas.push(results.appChosen);
            apps.mas.sort();
            break;
        }

        fs.writeFileSync(appsConfigPath, JSON.stringify(apps, null, 2));
        console.log(chalk.green("App Installed"));
      });
  });

program.version(pkg.version).parse(process.argv);
