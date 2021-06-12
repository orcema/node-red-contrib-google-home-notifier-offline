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
const cacheFolder ="/tmp"
var listOfDevices = [];


module.exports = function (RED) {

  // Configuration node
  function GoogleHomeConfig(n) {
    // localFileServerRestart();

    RED.nodes.createNode(this, n);

    persistUserDeviceConfigs(n);

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
    serverPort=(n.mediaListenPort?n.mediaListenPort:8089);
    this.googlehomenotifier = require('google-home-notifier-offline')(
      n.ipaddress, 
      n.language, 
      1,
      serverIP,
      serverPort,
      cacheFolder,
      (n.notificationLevel?n.notificationLevel/100:0.2)
      );

    //Build another API to auto detect IP Addresses
    discoverIpAddresses('googlecast', function (ipaddresses) {
      RED.httpAdmin.get('/ipaddresses', function (req, res) {
        res.json(ipaddresses);
      });
    });
  };

  RED.nodes.registerType("googlehome-config-node-offline", GoogleHomeConfig);

  //--------------------------------------------------------

  function GoogleHomeNotifier(n) {
    RED.nodes.createNode(this, n);
    var node = this;

    //Validate config node
    var config = RED.nodes.getNode(n.server);
    this.configname = config.name;
    if (config === null || config === undefined) {
      node.status({
        fill: "red",
        shape: "ring",
        text: "please create & select a config node"
      });
      return;
    }

    //On Input
    node.on('input', function (msg) {
      //Validate config node
      if (config === null || config === undefined) {
        node.status({
          fill: "red",
          shape: "ring",
          text: "please create & select a config node"
        });
        return;
      }

      //play music if it is a mp3 url
      var expression = /^https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{2,256}\/([-a-zA-Z0-9@:%_\+.~#?&//=]*).mp3$/;
      var regex = new RegExp(expression);
      if(msg.payload.toLowerCase().match(regex)){
        config.googlehomenotifier.play(msg.payload, function (result) {
          node.status({
            fill: "green",
            shape: "ring",
            text: "Successfully played mp3"
          });
        });
        return;
      }

      // config.googlehomenotifier.setEmitVolume(msg.emitVolume,function(){ // toggle the emit volume
      //   config.googlehomenotifier.notify(msg.payload, function (result) {
      //     node.status({
      //       fill: "green",
      //       shape: "ring",
      //       text: "Successfully sent voice command"
      //     });
      //   });
      // })
      
      if (msg.emitVolume){
        config.googlehomenotifier.setEmitVolume(msg.emitVolume);
      }
      if (msg.speed){
        config.googlehomenotifier.setSpeechSpeed(msg.speed);
      }

      node.status({
        fill: "blue",
        shape: "dot",
        text: "preparing voice message"
      });

      config.googlehomenotifier
        // .setFileServerPort(msg.fileServerPort===undefined?"":msg.fileServerPort)
        // .setCacheFolder(msg.cacheFolder===undefined?"":msg.cacheFolder)
        .notify(msg.payload)
        .then(_ =>
          node_status_ready()
          )
          .catch(e => 
            node.status(node.status({
              fill:"red",
              shape:"ring",
              text:e
            })));
    });

    config.googlehomenotifier.on('status', function (message) {
      node.status({
        fill: "blue",
        shape: "dot",
        text: message
      });
    }),

    config.googlehomenotifier.on('error', function (message) {
      node.status({
        fill: "red",
        shape: "ring",
        text: message
      });
    });

    //Workaround for a known issue
    if (config.googlehomenotifier === null || config.googlehomenotifier === undefined) {
      node.status({
        fill: "red",
        shape: "ring",
        text: "please select a non-Default language"
      });
      return;
    }

    node_status_ready();

    config.googlehomenotifier.setMaxListeners(Infinity);

    function node_status_ready() {
      node.status({
        fill: "green",
        shape: "dot",
        text: "ready"
      });
    }
  };

  RED.nodes.registerType("googlehome-notifier-offline", GoogleHomeNotifier);


  function persistUserDeviceConfigs(n) {
    const updatedDevice = listOfDevices.find(device => device.id === n.id);
    if (updatedDevice) {
      listOfDevices.forEach(device => {
        if (device.id === n.id) {
          device = n;
        }
      });
    } else {
      listOfDevices.push(n);
    }
  }
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
  
  function localFileServerClose(callback) {
    if (httpServer !== "") {
      httpServer.close(function () {
        httpServer = "";
      });
    }
    callback();
  }
  
  function localFileServerStart() {
  
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
  
  function localFileServerRestart() {
    if (httpServer === "") {
      localFileServerStart();
    } else {
      localFileServerClose(function () {
        localFileServerStart();
      })
    }
  }
  localFileServerStart();

};



