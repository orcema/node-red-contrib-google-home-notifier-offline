'use strict';

// id:'5c358089.a0f02'
// ipaddress:'192.168.10.217'
// language:'fr'
// name:'GoogleHome'
// notificationLevel:'20'
// type:'googlehome-config-node-offline'
var httpServer = "";

var ip = require("ip");
var serverIP = ip.address();
var serverPort = "8089"; // default port for serving mp3
var cacheFolder = "/tmp"
var listOfDevices = [];


module.exports = function (RED) {

  // Configuration node
  function GoogleHomeConfig(nodeServer) {
    // localFileServerRestart();

    RED.nodes.createNode(this, nodeServer);

    // persistUserDeviceConfigs(nodeConfig);

    //Prepare language Select Box
    var obj = require('./languages');
    //map to Array:
    var languages = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        languages.push({
          key: key,
          value: obj[key]
        });
      }
    };

    //Build an API for config node HTML to use
    RED.httpAdmin.get('/languages', function (req, res) {
      res.json(languages || []);
    });

    //Known issue: when 'language' is Default/Auto, this will fail & return undefined
    serverPort = (nodeServer.mediaListenPort ? nodeServer.mediaListenPort : 8089);
    cacheFolder = (nodeServer.cacheFolder?nodeServer.cacheFolder:cacheFolder);
    this.googlehomenotifier = require('google-home-notifier-offline')(
      nodeServer.ipaddress,
      nodeServer.language,
      1,
      serverIP,
      serverPort,
      cacheFolder,
      (nodeServer.notificationLevel ? nodeServer.notificationLevel / 100 : 0.2)
    );

    this.setMaxListeners(Infinity);


    //Build another API to auto detect IP Addresses
    discoverIpAddresses('googlecast', function (ipaddresses) {
      RED.httpAdmin.get('/ipaddresses', function (req, res) {
        res.json(ipaddresses);
      });
    });
  };

  RED.nodes.registerType("googlehome-config-node-offline", GoogleHomeConfig);

  //--------------------------------------------------------

  function GoogleHomeNotifier(nodeInFlow) {
    RED.nodes.createNode(this, nodeInFlow);
    const nodeInstance = this;
    const nodeServerInstance = RED.nodes.getNode(nodeInFlow.server);

    if (nodeServerInstance === null || nodeServerInstance === undefined) {
      node_status_error("please assign node to a cast device")
      return;
    }

    nodeInstance.on('input', function (msg) {
      //Validate config node
      if (nodeServerInstance === null || nodeServerInstance === undefined) {
        nodeInstance.status({
          fill: "red",
          shape: "ring",
          text: "please create & select a config node"
        });
        return;
      }

      //Workaround for a known issue
      if (nodeServerInstance.googlehomenotifier === null || nodeServerInstance.googlehomenotifier === undefined) {
        node_status_error("please select a non-Default language")
        return;
      }

      applySettingsFromMessage(msg);

      node_status("preparing voice message")

      nodeServerInstance.googlehomenotifier
        .notify(msg.payload)
        .then(_ =>
          node_status_ready())
        .catch(e =>
          node_status_error(e));
    });

    nodeServerInstance.googlehomenotifier.on('status', function (message) {
      node_status(message);
    });

    nodeServerInstance.googlehomenotifier.on('error', function (message) {
      node_status_error(message);
    });

    node_status_ready();

    /* #region  helpers */
    function applySettingsFromMessage(msg) {
      if (msg.emitVolume) {
        nodeServerInstance.googlehomenotifier.setEmitVolume(msg.emitVolume);
      }
      if (msg.speed) {
        nodeServerInstance.googlehomenotifier.setSpeechSpeed(msg.speed);
      }
    }
    /* #endregion */

    //#region node notifications
    function node_status(message) {
      nodeInstance.status({
        fill: "blue",
        shape: "dot",
        text: message
      });
    }

    function node_status_ready() {
      nodeInstance.status({
        fill: "green",
        shape: "dot",
        text: "ready"
      });
    }

    function node_status_error(message) {
      nodeInstance.status({
        fill: "red",
        shape: "ring",
        text: message
      });
    }
    //#endregion


  };

  RED.nodes.registerType("googlehome-notifier-offline", GoogleHomeNotifier);

  mediaServerStart();

  /* #region  global helpers */
  function discoverIpAddresses(serviceType, discoveryCallback) {
    var ipaddresses = [];
    var bonjour = require('bonjour')();
    var browser = bonjour.find({
      type: serviceType
    }, function (service) {
      service.addresses.forEach(function (element) {
        if (element.split(".").length == 4) {
          var label = "" + service.txt.md + " (" + element + ")";
          ipaddresses.push({
            label: label,
            value: element
          });
        }
      });

      //Add a bit of delay for all services to be discovered
      if (discoveryCallback)
        setTimeout(function () {
          discoveryCallback(ipaddresses);
        }, 2000);
    });
  }

  function mediaServerClose(callback) {
    if (httpServer !== "") {
      httpServer.close(function () {
        httpServer = "";
      });
    }
    callback();
  }

  function mediaServerStart() {

    const FileServer = require('file-server');

    const fileServer = new FileServer((error, request, response) => {
      response.statusCode = error.code || 500;
      response.end("404: Not Found " + request.url);
    });

    const serveRobots = fileServer.serveDirectory(cacheFolder, {
      '.mp3': 'audio/mpeg'
    });

    httpServer = require('http')
      .createServer(serveRobots)
      .listen(serverPort);
    console.log("fileServer listening on ip " + serverIP + " and port " + serverPort);

  }

  function mediaServerRestart() {
    if (httpServer === "") {
      mediaServerStart();
    } else {
      mediaServerClose(function () {
        mediaServerStart();
      })
    }
  }
  /* #endregion */

  

};



