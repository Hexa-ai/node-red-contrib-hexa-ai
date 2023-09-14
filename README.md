# node-red-contrib-hexa-ai

[![platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
![NPM version](https://badge.fury.io/js/@hexa-ai%2Fnode-red-contrib-hexa-ai.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This package provides a set of nodes in Node-RED to manage variables data, history (using [warp10](https://www.warp10.io/)) and alarms.

## Pre-requisites

The package requires [Node-RED](https://nodered.org) to be installed.

## Install

To install the stable version use the `Menu - Manage palette` option and search for `node-red-contrib-hexa-ai`, or run the following command in your Node-RED user directory - typically `~/.node-red`:

    npm i node-red-contrib-hexa-ai

Restart your Node-RED instance and you should have the nodes available in the palette and a new `Hexa AI` tab in the right side panel.

## Available nodes

* :arrow_heading_down: **write-variable** : A node for storing typed variables
  * Variable value stored in node-red global context
  * Js primitive type and user-friendly unit for display
  * Data historicization (with warp10)
  * Value monitoring and alert trigger
* :arrow_heading_up: **read-variable** : A node for receiving values from write variable
  * Value is sent at the initialization of the node (using global context)
  * Value modification sent in real time using event bus
* :bell: **on-alarm** : A node for receiving alarms triggered by write variable
  * Two outputs : when an alarm is up, when an alarm is down
* :link: **history-warp10** : A node for sending variables histories into warp10 timeseries
  * Hold a buffer of variable modifications (with timestamp) and flush it into warp10

## Available config nodes

* :link: **warp10** : A node for configuring warp10 connections.
  * Specify a HTTP endpoint and write token for the connection

## Advanced tips

### Variable naming

Use dot notations for variable names such as `floor1.vent.speed`. Then using read/alarm you can match them by using wildcards, like this : `floor1.vent.*` (the output message will contain a `origin` js object containing the matched variable).

### Single write-variable and multiple variables

You can omit the variable name into the `write-variable` node. Instead, put the variable name into the `topic` alongside the `payload` containing the value.
