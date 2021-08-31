# scrcpy-miniprogram
## Prerequisites
1. make sure the node is available in your environment and execute 'npm install' to install necessary node module.
2. make sure the adb command is available in your environment

## For testing
1. run a powershell and execut command 'node .\tcpproxy_scrcpy.js 20001 localhost 20002 20003 7b64fd95 "LD_LIBRARY_PATH=/system/lib64:/system/product/lib64:/data/local/tmp CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server"'
2. open miniprogram 