# node-red-contrib-google-home-notifier-offline

**version 0.0.6:**
**fix:** when casting to multiple devices, restoring devices inital volume level didn't work, thus all the devices remained at the announcement volume level.

This node is forked from:
<a href="https://github.com/nabbl/node-red-contrib-google-home-notify">node-red-contrib-google-home-notify</a>

Notifications sent to google home assistant usually request for each notification an internet connection.
This connection is needed because the notification text is sent to google-tts server (https://translate.google.com/) in order to get a link to an mp3 file having the notification text.
Then google assistant is requested to play this mp3 file from the internet.

~~For me this was an issue especially for notification about security (e.g. garage door is open). It was not acceptable to have external dependencies like the availability of the internet connection and hoping google-tts has not changed/updated his api.
Thus for me raised the need for offline notifications that run locally without external dependencies. 
This is why "node-red-contrib-google-home-notifier-offline" emerged.~~

**important:**<br>
**offline** refers to the announcement text being played from a local folder, but you still need an internet connection for casting to your google device, this i due to the google casting architecture.

How to use:

Notification text you send can be updated with:

1) **emitVolume** : value 0 up to 100, this is the notification volume. The initial volume level is restored after the notification. The default level is 20%.

2) **cacheFolder** :  this can be any folder on the machine. If the cache folder is set, the notifiation will be played always from cache. 
If the file is not in cache, the node will request the mp3 file from google-tts and save it to the local cache folder.

3) **fileServerPort** : this has only to be set if you have already an listener on the default port 8081.

![illustration](assets/illustration.PNG)


Sample code here below for grouping your google devices in subflows : (copy & paste in node-red using import from clipboard)

``` js
[{"id":"b62d5d6a.1a7b4","type":"subflow","name":"GoogleHomeNotification","info":"","in":[{"x":50,"y":30,"wires":[{"id":"1b4731d5.cd104e"}]}],"out":[]},{"id":"3e06c5a2.657b7a","type":"switch","z":"b62d5d6a.1a7b4","name":"GoogleNotifyDestination","property":"destination","propertyType":"msg","rules":[{"t":"eq","v":"living","vt":"str"},{"t":"eq","v":"bureau","vt":"str"},{"t":"eq","v":"all","vt":"str"}],"checkall":"true","repair":false,"outputs":3,"x":450,"y":260,"wires":[["ff070d10.4ac24"],["e346f9f.5d5ab08"],["ff070d10.4ac24","e346f9f.5d5ab08"]],"outputLabels":["Google Home","Google Home mini",""]},{"id":"ff070d10.4ac24","type":"googlehome-notifier-offline","z":"b62d5d6a.1a7b4","server":"a7f2647a.e13128","name":"Google Home","x":800,"y":180,"wires":[]},{"id":"e346f9f.5d5ab08","type":"googlehome-notifier-offline","z":"b62d5d6a.1a7b4","server":"49251785.5082b8","name":"Google Home Mini","x":790,"y":320,"wires":[]},{"id":"1b4731d5.cd104e","type":"change","z":"b62d5d6a.1a7b4","name":"","rules":[{"t":"set","p":"cacheFolder","pt":"msg","to":"/config/GHCache","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":200,"y":260,"wires":[["3e06c5a2.657b7a"]]},{"id":"a7f2647a.e13128","type":"googlehome-config-node-offline","z":"b62d5d6a.1a7b4","ipaddress":"192.168.20.194","name":"Google Home","language":"fr"},{"id":"49251785.5082b8","type":"googlehome-config-node-offline","z":"b62d5d6a.1a7b4","ipaddress":"192.168.20.197","name":"Google Home Mini","language":"fr"},{"id":"e5e323e1.3b0b","type":"subflow:b62d5d6a.1a7b4","z":"c348d271.07631","name":"","x":690,"y":700,"wires":[]},{"id":"d5278257.32b69","type":"change","z":"c348d271.07631","name":"","rules":[{"t":"set","p":"destination","pt":"msg","to":"all","tot":"str"},{"t":"set","p":"emitVolume","pt":"msg","to":"50","tot":"str"},{"t":"set","p":"payload","pt":"msg","to":"Le sèche linge a terminé","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":420,"y":660,"wires":[["e5e323e1.3b0b"]]},{"id":"5b71dd5a.2ecfc4","type":"inject","z":"c348d271.07631","name":"","topic":"","payload":"ceci test un test","payloadType":"str","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":180,"y":700,"wires":[["d5278257.32b69"]]}]
```
