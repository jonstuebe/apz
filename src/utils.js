const { exec } = require("child_process");
const { isArray } = require("lodash");
const Promise = require("bluebird");

const numApps = apps => {
  let num = 0;
  if (apps.mas) {
    num += apps.mas.length;
  }

  if (apps.cask) {
    num += apps.cask.length;
  }

  return num;
};

const masSearch = query => {
  return new Promise((resolve, reject) => {
    exec(`mas search "${query}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }

      if (stdout) {
        let results = stdout
          .split("\n")
          .map(app => {
            app = app.replace(/\(.*\)$/, "").trim();
            const match = /([0-9]{4,}?) /.exec(app);
            if (!match) {
              return null;
            }

            const id = match[1];
            const name = app.replace(`${id} `, "");
            return {
              name,
              value: {
                id,
                name
              }
            };
          })
          .filter(app => app !== null);

        return resolve(results);
      }
    });
  });
};

const caskSearch = query => {
  return new Promise((resolve, reject) => {
    exec(`brew search ${query}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }

      if (stdout) {
        const match = /==> Casks\n(.*)/.exec(stdout);
        let results = match[1].split("\n").filter(result => {
          if (result.includes("homebrew/") || result === "") {
            return false;
          }
          return true;
        });

        return resolve(results);
      }
    });
  });
};

const caskInstall = (apps = []) => {
  if (typeof apps === "string") {
    apps = [apps];
  }

  return Promise.map(apps, app => {
    return new Promise((resolve, reject) => {
      exec(`brew cask install ${app}`, (error, stdout, stderr) => {
        if (error) {
          if (error.message.includes("It seems there is already an App at")) {
            return resolve({ app, installed: true });
          }
          return reject({ app, error });
        }

        if (stderr.includes("is already installed")) {
          return resolve({ app, installed: true });
        }

        if (stdout.includes("was successfully installed")) {
          return resolve({ app, installed: true });
        }

        return reject({ app, error: new Error("Install failed") });
      });
    });
  });
};

const masInstall = (apps = []) => {
  if (!isArray(apps)) {
    apps = [apps];
  }

  return Promise.map(apps, app => {
    return new Promise((resolve, reject) => {
      exec(`mas install ${app.id}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return reject({ app: app.name, error });
        }

        if (stdout.includes("is already installed")) {
          return resolve({ app: app.name, installed: true });
        }

        if (stdout.includes("Installed ")) {
          return resolve({ app: app.name, installed: true });
        }

        return reject({ app: app.name, error: new Error("Install failed") });
      });
    });
  });
};

module.exports = {
  numApps,
  masSearch,
  caskSearch,
  caskInstall,
  masInstall
};
