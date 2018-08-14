const inquirer = require("inquirer");
const { exec } = require("child_process");
const { isArray } = require("lodash");
const Promise = require("bluebird");
const Gists = require("gists");
const fs = require("fs");

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
        let results = match[1].split("\n");

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

const homedir = require("os").homedir();
const appsConfigPath = `${homedir}/apps.json`;

const getConfig = () => {
  if (!fs.existsSync(appsConfigPath)) {
    fs.writeFileSync(
      appsConfigPath,
      JSON.stringify({ cask: [], mas: [] }, null, 2),
      "utf8"
    );
  }
  let apps = require(appsConfigPath);
  return apps;
};

const updateConfig = apps => {
  fs.writeFileSync(appsConfigPath, JSON.stringify(apps, null, 2));
  return true;
};

const createGist = (gists, apps) => {
  return new Promise((resolve, reject) => {
    gists.create(
      {
        files: { "apps.json": { content: JSON.stringify(apps, null, 2) } },
        description: "apz apps config"
      },
      (err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      }
    );
  });
};

const editGist = (gists, apps) => {
  return new Promise((resolve, reject) => {
    gists.edit(
      {
        id: apps.gist,
        files: { "apps.json": { content: JSON.stringify(apps, null, 2) } }
      },
      (err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      }
    );
  });
};

const downloadGist = id => {
  return new Promise((resolve, reject) => {
    const apps = getConfig();
    if (!apps.token) {
      return reject(new Error(noTokenErrorMessage));
    }
    const gists = new Gists({
      token: apps.token
    });
    gists.download({ id }, (err, res) => {
      if (err) {
        return reject(err);
      }
      if (!res.files["apps.json"]) {
        return reject(new Error("incorrect gist provided"));
      }
      return resolve(JSON.parse(res.files["apps.json"].content));
    });
  });
};

const noTokenErrorMessage = "Please run the command `apz token`";

const createOrUpdateGist = async apps => {
  if (!apps.token) {
    throw new Error(noTokenErrorMessage);
    return;
  }
  const gists = new Gists({
    token: apps.token
  });
  let res;
  if (!apps.gist) {
    res = await createGist(gists, apps);
    apps.gist = res.id;
    updateConfig(apps);
    await editGist(gists, apps);
  } else {
    let res = await editGist(gists, apps);
    if (res.message === "Not Found") {
      res = await createGist(gists, apps);
      apps.gist = res.id;
      updateConfig(apps);
      await editGist(gists, apps);
    }
  }
};

module.exports = {
  numApps,
  masSearch,
  caskSearch,
  caskInstall,
  masInstall,
  getConfig,
  createOrUpdateGist,
  homedir,
  appsConfigPath,
  updateConfig,
  downloadGist
};
