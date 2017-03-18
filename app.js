const dgram 		= require('dgram');
const socket 		= dgram.createSocket('udp4');
const decagonIP 	= '64.126.163.196';
const decagonHost 	= 'tahmo.decagon.com';
const decagonPort	= 8035;

// Store last connection from datalogger to return packages
var lastDatalogger	= { 'address': undefined, 'port': undefined };

socket.on('error', (err) => {
	console.log(`Server error:\n${err.stack}`);
	socket.close();
	process.exit(1);
});

socket.on('message', (msg, rinfo) => {
	console.log(`Received ${rinfo.size} bytes from ${rinfo.address}:${rinfo.port}`);
	// Packet originates from datalogger and should be sent to Decagon
	if(rinfo.address != decagonIP)
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
				console.log(`Packet with size of ${rinfo.size} bytes redirected to Decagon`);
			}
		});
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