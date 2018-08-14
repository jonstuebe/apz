# apz

A small utility to help with installing and managing your apps.

## Prerequisites

Make sure you have the following installed:

- xcode
- homebrew
- mas (via brew)
- nodejs (or nvm)

## Install

```shell
npm install -g apz
```

## Setup

To get started, you'll need to go create a personal access token on github and allow it to create/edit gists.

Once you've completed this, run the following:

```shell
apz token
```

This will add your token to the config and allow you to run any of the following commands:

## Commands

#### Add an App

To add an application to the global config as well as install it run:

```shell
apz add
```

#### Install All Applications

To install all applications from the global config ~/apps.json run:

```shell
apz install
```

#### Restore from Gist

To restore your config from a gist run:

```shell
apz restore
```
