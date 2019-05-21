var express = require('express');
var app = express();
var server = require('http').Server(app);
// there is a socket.io and uWebSocket issue in Windows 10
// therefore need to change the wsEngine to ws
// further details: https://github.com/socketio/socket.io/issues/3100
var io = require('socket.io')(server, { wsEngine: 'ws'});
var bodyParser = require('body-parser');
var port = process.env.PORT || 28094;
var MongoClient = require('mongodb').MongoClient;
//mongodb://admin:1234@ds123619.mlab.com:23619/qubic

var db;
var room_id = 0;
var users = [];
var players = [];
var turns = [];
var first_turn;
var current_player;
var first_player_id;
var first_player;
var player_1 = [];
var player_2 = [];
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

MongoClient.connect('mongodb://cjl27:CB3Ytdgs@127.0.0.1:27017/cmpt218_cjl27?authSource=admin', function(err, client){
	if(err) return console.log(err);
	db = client.db('cmpt218_cjl27');
	server.listen(port, function(){
		console.log('listening on port: ' + port);
	});
})

app.get('/', function(req, res){
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', function(req, res){
	db.collection('player').findOne({username: req.body.username}, function(err, user){
		if(err) console.log(err);
		if(!user) res.status(200).json({msg: 'user does not exist'});
		else if(users.indexOf(req.body.username) != -1) res.status(200).json({msg: 'user already signed in'});
		else if(user.password !== req.body.password) res.status(200).json({msg: 'incorrect credentials'});
		else res.status(200).json({msg: 'login success', data: user.username});
	});
});

app.get('/landing/:username', function(req, res){
	var header = '<header><title>Player Status</title>'+
				'<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">'+
				'<link href="/css/form.css" rel="stylesheet"></header>';

	var table = '<div class="container center">'+
				'<div id="wrapper" class="center">'+
				'<h1>Summary</h1>'+
				'<table id="status_board" class="center">'+
				'<tr><th>Username</th>'+
				'<th>Wins</th>'+
				'<th>Losses</th>'+
				'<th>Games Played</th>'+
				'<th>Win Rate</th>'+
				'<th>Average Moves</th>'+
				'<th>Average Time</th>';

	var button = '<div id="button" class="center">'+
				'<button class="btn_large" onclick="location.href=\'/qubic?username=' + req.params.username + '\'">New Game</button>'+
				'<button class="btn_large" onclick="location.href=\'/logout/' + req.params.username + '\'">Logout</button></div></div></div>';

	var avg_moves = 0;
	var game_count = 0;
	var avg_time = 0;
	var hour;
	var minute;
	var second;
	db.collection('status').find({username: req.params.username}).forEach(function(player){
		var start_time = player.start_time.match(/[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0].split(':');
		var end_time = player.end_time.match(/[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0].split(':');
		avg_time += parseInt(end_time[0])*3600 + parseInt(end_time[1])*60 + parseInt(end_time[2]) - 
					parseInt(start_time[0])*3600 - parseInt(start_time[1])*60 - parseInt(start_time[2]);
		avg_moves += player.moves;
		game_count++;
	}, function(err){
		avg_moves = (game_count == 0) ? '' : (avg_moves/game_count).toFixed(2);
		avg_time = (game_count == 0) ? '' : avg_time/game_count;
		if(avg_time >= 3600){
			hour = Math.floor(avg_time / 3600);
			if(avg_time-hour*3600 >= 60) minute = Math.floor((avg_time-hour*3600) / 60);
			if((avg_time-hour*3600)/60 != 0) second = avg_time - hour * 3600 - minute * 60;
		}else if(avg_time < 3600){
			if(avg_time >= 60) minute = Math.floor(avg_time / 60);
			if(avg_time-minute*60 != 0) second = avg_time - minute * 60;
			if(avg_time < 60) second = avg_time;
		}

		db.collection('player').findOne({username: req.params.username}, function(err, user){
			var win_rate = (game_count == 0) ? '' : (user.wins/game_count*100).toFixed(2); 
			var time = '';
			if(hour) time += hour.toFixed(2) + 'h ';
			if(minute) time += minute.toFixed(2) + 'm ';
			if(second) time += second.toFixed(2) + 's';

			table += '<tr><td>' + user.username + '</td>'+
					'<td>' + user.wins + '</td>'+
					'<td>' + user.losses + '</td>'+
					'<td>' + game_count + '</td>'+
					'<td>' + win_rate + '%' + '</td>'+
					'<td>' + avg_moves + '</td>'+
					'<td>' + time + '</td>'+ '</td></tr></table>';

			var html = '<!DOCTYPE html><html>' + header + '<body>' + table + button + '</body></html>';
			users.push(user.username);
			console.log('Currently ' + users.length + ' users connected');
			res.send(html);
		});
	});
});

app.get('/register', function(req, res){
	res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', function(req, res){
	db.collection('player').findOne({username: req.body.username}, function(err, user){
		if(err) console.log(err);
		if(user) return res.status(200).json({msg: 'user already exists'});
		var user_info = {
			username : req.body.username,
			password : req.body.password,
			first_name : req.body.first_name, 
			last_name : req.body.last_name, 
			age : req.body.age,
			gender : req.body.gender,
			email : req.body.email,
			wins : 0,
			losses : 0
		}
		db.collection('player').insertOne(user_info, function(err, result){
			if(err) console.log(err);
			res.status(200).json({msg: 'register success'});
		});
	});
});

app.get('/win/:id', function(req, res){
	var header = '<header><title>Player Status</title>'+
				'<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">'+
				'<link href="/css/form.css" rel="stylesheet"></header>';

	var table = '<div class="container center">'+
				'<div id="wrapper" class="center">'+
				'<h1>You Win</h1>'+
				'<table id="status_board" class="center">'+
				'<tr><th>Username</th>'+
				'<th>Opponent</th>'+
				'<th>Moves</th>'+
				'<th>Order</th>'+
				'<th>Wins</th>'+
				'<th>Losses</th>'+
				'<th>Start Time</th>'+
				'<th>End Time</th>';

	
	db.collection('status').findOne({id: req.params.id}, function(err, player){
		db.collection('player').findOne({username: player.username}, function(err, user){
			table += '<tr><td>' + player.username + '</td>'+
				'<td>' + player.opponent + '</td>'+
				'<td>' + player.moves + '</td>'+
				'<td>' + player.order + '</td>'+
				'<td>' + user.wins + '</td>'+
				'<td>' + user.losses + '</td>'+
				'<td>' + player.start_time + '</td>'+
				'<td>' + player.end_time + '</td></tr></table>';

			var button = '<div id="button" class="center">'+
						'<button class="btn_large" onclick="location.href=\'/qubic?username=' + player.username + '\'">Next Game</button>'+
						'<button class="btn_large" onclick="location.href=\'/logout/' + player.username + '\'">Logout</button></div></div></div>';
			var html = '<!DOCTYPE html><html>' + header + '<body>' + table + button + '</body></html>';
			res.send(html);
		});
	});
});

app.get('/lose/:id', function(req, res){
	var header = '<header><title>Player Status</title>'+
				'<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">'+
				'<link href="/css/form.css" rel="stylesheet"></header>';

	var table = '<div class="container center">'+
				'<div id="wrapper" class="center">'+
				'<h1>You Lose</h1>'+
				'<table id="status_board" class="center">'+
				'<tr><th>Username</th>'+
				'<th>Opponent</th>'+
				'<th>Moves</th>'+
				'<th>Order</th>'+
				'<th>Wins</th>'+
				'<th>Losses</th>'+
				'<th>Start Time</th>'+
				'<th>End Time</th>';

	db.collection('status').findOne({id: req.params.id}, function(err, player){
		db.collection('player').findOne({username: player.username}, function(err, user){
			table += '<tr><td>' + player.username + '</td>'+
				'<td>' + player.opponent + '</td>'+
				'<td>' + player.moves + '</td>'+
				'<td>' + player.order + '</td>'+
				'<td>' + user.wins + '</td>'+
				'<td>' + user.losses + '</td>'+
				'<td>' + player.start_time + '</td>'+
				'<td>' + player.end_time + '</td></tr></table>';

			var button = '<div id="button" class="center">'+
						'<button class="btn_large" onclick="location.href=\'/qubic?username=' + player.username + '\'">Next Game</button>'+
						'<button class="btn_large" onclick="location.href=\'/logout/' + player.username + '\'">Logout</button></div></div></div>';
			var html = '<!DOCTYPE html><html>' + header + '<body>' + table + button + '</body></html>';
			res.send(html);
		});
	});
});

app.get('/logout/:username', function(req, res){
	if(users.indexOf(req.params.username) != -1) users.splice(users.indexOf(req.params.username), 1);
	console.log('Currently ' + users.length + ' users connected');
	if(players.indexOf(req.params.username) != -1) players.splice(players.indexOf(req.params.username), 1);
	console.log('Currently ' + players.length + ' players connected');
	res.redirect('/');
});

app.get('/qubic', function (req, res){
	current_player = req.query.username;
	res.sendFile(__dirname + '/public/qubic.html');
});

io.on('connection', function(socket){
	socket.username = current_player;

	socket.on('connect player', function(player_info){
		players.push(current_player);
		console.log('connect Currently ' + players.length + ' players connected');
		player_info.id = socket.username + Date.now();
		player_info.username = socket.username;
		player_info.room = 'room_' + room_id;
		player_info.turn = (Math.floor(Math.random() * 101) < 50) ? 'X' : 'O';
		socket.join('room_' + room_id);
		var room = io.sockets.adapter.rooms['room_' + room_id];
		player_1[room_id] = '';
		player_2[room_id] = '';

		if(room.length == 1){
			first_turn = player_info.turn;
			first_player_id = player_info.id;
			first_player = player_info.username;
			socket.emit('update player', player_info);
			socket.emit('wait player');
		} 
		else if(room.length == 2){
			var time = new Date();
			player_info.start_time = '' + time;
			player_info.oid = first_player_id;
			player_info.opponent = first_player;
			player_info.turn = (first_turn == 'X') ? 'O' : 'X';
			turns[room_id] = (Math.floor(Math.random() * 101) > 50) ? 'X' : 'O';
			socket.emit('update player', player_info);
			socket.broadcast.to('room_' + room_id).emit('update opponent', {start_time: player_info.start_time, oid: player_info.id, opponent: player_info.username});
			io.in('room_' + room_id).emit('start game');
		}

		if(players.length % 2 == 0) room_id++;
	});

	socket.on('validate move', function(data, callback){
		if(!data || data.cell!='' || data.x>3 || data.x<0 || data.y>3 || data.y<0 || data.turn!=turns[data.room]){
			callback(false);
		}else{
			callback(true);
			io.in('room_'+data.room).emit('update game', {x: data.x, y: data.y, table: data.table, turn:data.turn});

			if(data.turn == 'X'){
				player_1[data.room] += '' + data.x + data.y + ',';
				if(check_win(player_1[data.room], data.x, data.y)){
					var time = new Date();
					var order = (data.turn == turns[data.room]) ? 'first' : 'second';
					socket.emit('win game', {id: data.id, end_time: ''+time, order: order});
					order = (order == 'first') ? 'second' : 'first';
					socket.broadcast.to('room_'+data.room).emit('lose game', {id: data.oid, end_time: ''+time, order: order});
				}
			}else if(data.turn == 'O'){
				player_2[data.room] += '' + data.x + data.y + ',';
				if(check_win(player_2[data.room], data.x, data.y)){
					var time = new Date();
					var order = (data.turn == turns[data.room]) ? 'first' : 'second';
					socket.emit('win game', {id: data.id, end_time: ''+time, order: order});
					order = (order == 'first') ? 'second' : 'first';
					socket.broadcast.to('room_'+data.room).emit('lose game', {id: data.oid, end_time: ''+time, order: order});
				}
			}

			turns[data.room] = (data.turn == 'X') ? 'O' : 'X';
		}
	});

	socket.on('quit game', function(data){
		var time = new Date();
		var order = (data.turn == turns[parseInt(data.room.split('_')[1])]) ? 'first' : 'second';
		socket.emit('lose game', {id: data.id, end_time: ''+time, order: order});
		order = (order == 'first') ? 'second' : 'first';
		socket.broadcast.to(data.room).emit('win game', {id: data.oid, end_time: ''+time, order: order});
	});

	socket.on('update winner', function(player, callback){
		db.collection('status').insertOne(player, function(err, result){
			if(err) callback(false);
			db.collection('player').findOne({username: player.username}, function(err, user){
				if(err) callback(false);
				db.collection('player').updateOne({username: player.username}, {$set: {wins: ++user.wins}}, function(){});
				callback(true);
			});
		});
	});

	socket.on('update loser', function(player, callback){
		db.collection('status').insertOne(player, function(err, result){
			if(err) callback(false);
			db.collection('player').findOne({username: player.username}, function(err, user){
				if(err) callback(false);
				db.collection('player').updateOne({username: player.username}, {$set: {losses: ++user.losses}}, function(){});
				callback(true);
			});
		});
	});
	
	socket.on('disconnect', function(){
		if(players.indexOf(socket.username) != -1) players.splice(players.indexOf(socket.username), 1);
		console.log('Currently ' + players.length + ' players connected');
	});
});

function check_win(moves, x, y){
	if(moves.split(',').length < 4) return false;
	var col = new RegExp(x + '[0-9]', 'g');
	var row = new RegExp('[0-9]' + y, 'g');
	var col_count = (moves.match(col) || []).length;
	var row_count = (moves.match(row) || []).length;
	var left_diag_count = (moves.match(/(00|11|22|33)/g) || []).length;
	var right_diag_count = (moves.match(/(03|12|21|30)/g) || []).length;
	if(col_count==4 || row_count==4 || left_diag_count==4 || right_diag_count==4) return true;	
	return false;
}