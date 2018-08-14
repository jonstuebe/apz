const inquirer = require("inquirer");
const Promise = require("bluebird");
const ora = require("ora");
const clear = require("clear");
const program = require("commander");
const fs = require("fs");
const chalk = require("chalk");
const _ = require("lodash");

const pkg = require("../package.json");
const {
  caskSearch,
  caskInstall,
  masSearch,
  masInstall,
  numApps,
  getConfig,
  appsConfigPath,
  createOrUpdateGist,
  updateConfig,
  downloadGist
} = require("./utils");

let apps = getConfig();

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
  .command("token")
  .description("Add a github personal access token")
  .action(() => {
    inquirer
      .prompt([
        {
          type: "input",
          name: "token",
          message: "Enter the personal access token from github:"
        }
      ])
      .then(({ token }) => {
        let apps = getConfig();
        apps.token = token;
        updateConfig(apps);
        console.log(chalk.green("Config Updated"));
      });
  });

program
  .command("restore")
  .description("Restore config from gist")
  .action(() => {
    inquirer
      .prompt([
        {
          type: "input",
          name: "gist",
          message: "Enter the id of the gist that contains your config:"
        }
      ])
      .then(({ gist }) => {
        downloadGist(gist)
          .then(apps => {
            updateConfig(apps);
            console.log(chalk.green("Config restored"));
          })
          .catch(err => {
            console.log(chalk.red(err.message));
            return;
          });
      });
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
        let toUpdate = false;
        let res;
        switch (results.source) {
          case "cask":
            if (!apps.cask) {
              apps.cask = [];
            }

            res = await caskInstall(results.appChosen);
            if (!apps.cask.includes(results.appChosen)) {
              apps.cask.push(results.appChosen);
              apps.cask.sort();
              toUpdate = true;
            }
            break;
          case "mas":
            if (!apps.mas) {
              apps.mas = [];
            }

            res = await masInstall(results.appChosen);
            if (!_.find(apps.mas, results.appChosen)) {
              apps.mas.push(results.appChosen);
              apps.mas.sort();
              toUpdate = true;
            }
            break;
        }

        if (toUpdate) {
          updateConfig(apps);
          await createOrUpdateGist(apps).catch(err => {
            console.log(chalk.red(err.message));
          });
        }
        console.log(chalk.green("App Installed"));
      });
  });

program.version(pkg.version).parse(process.argv);
