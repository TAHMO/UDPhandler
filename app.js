require('console-stamp')(console, '[yyyy-mm-dd HH:MM:ss.l]');
const express 		= require('express');
const fs 			= require('fs');
const dgram 		= require('dgram');
const socket 		= dgram.createSocket('udp4');
const app 			= express();

const decagonIP 	= '64.126.163.196';
const decagonHost 	= 'tahmo.decagon.com';
const decagonPort	= 8035;

// Store restart timestamp and create data dir if it doesn't exist yet
var startTime 		= (new Date).getTime();
fs.access('data', (err) => {
	if(err)
	{
		fs.mkdir('data');
	}
});

// Store last connection from datalogger to return packages
var lastDatalogger	= { 'address': undefined, 'port': undefined, 'time': undefined };

socket.on('error', (err) => {
	console.log(`Server error:\n${err.stack}`);
	socket.close();
	process.exit(1);
});

socket.on('message', (msg, rinfo) => {
	// Packet originates from datalogger and should be sent to Decagon
	if(rinfo.address != decagonIP)
	{
		console.log(`Received ${rinfo.size} bytes from ${rinfo.address}:${rinfo.port}`);

		// Check if UDP proxy is available
		if(lastDatalogger.time == undefined || ((new Date).getTime() - lastDatalogger.time > 2000) || (lastDatalogger.address == rinfo.address && lastDatalogger.port == rinfo.port))
		{
			socket.send(msg, 0, msg.length, decagonPort, decagonHost, (err) => {
				if(err)
				{
					console.log(`Error occured while redirecting to Decagon :\n${err.stack}`);
				}
				else
				{
					lastDatalogger.address 	= rinfo.address;
					lastDatalogger.port 	= rinfo.port;
					lastDatalogger.time 	= (new Date).getTime();
					console.log(`Packet with size of ${rinfo.size} bytes redirected to Decagon`);
					fs.appendFile('data/' + (new Date()).toISOString().split('T')[0] + '_' + lastDatalogger.address + '.txt', (new Date()).toISOString() + ' DATALOGGER ' + msg + '\n');
				}
			});
		}
		else
		{
			console.log(`Packet from ${rinfo.address} blocked, proxy is still busy`);
		}
	}
	// Packet originates from Decagon and should return to Decagon
	else
	{
		console.log(`Received ${rinfo.size} bytes from Decagon`);
		if(lastDatalogger.address !== undefined && lastDatalogger.port !== undefined)
		{
			socket.send(msg, 0, msg.length, lastDatalogger.port, lastDatalogger.address, (err) => {
				if(err)
				{
					console.log(`Error occured while redirecting to datlogger :\n${err.stack}`);
				}
				else
				{
					console.log(`Packet with size of ${rinfo.size} bytes redirected to datalogger`);
					fs.appendFile('data/' + (new Date()).toISOString().split('T')[0] + '_' + lastDatalogger.address + '.txt', (new Date()).toISOString() + ' DECAGON ' + msg + '\n');
				}
			});
		}
	}
});

socket.on('listening', () => {
	var address = socket.address();
	console.log(`Server listening on ${address.address}:${address.port}`);
});
socket.bind(8035);

app.get('/', function (req, res)
{
	res.send('<html><head><title>TAHMO UNMA - Data transmission overview</title></head><body><h2>TAHMO UNMA - Data transmission overview</h2><p>Last restart: ' + new Date(startTime).toISOString() + '</p><p>Last data transmission since restart: ' + ((lastDatalogger.time !== undefined) ? new Date(lastDatalogger.time).toISOString() : 'none') + '</p></body></html>');
});

app.listen(80);