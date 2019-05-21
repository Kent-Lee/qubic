var socket = io.connect();
var player_info = {
	id : '',
	username : '',
	oid : '',
	opponent : '',
	room : '',
	turn : '',
	moves : 0,
	start_time : '',
	end_time : '',
	order : ''
}

socket.on('connect', function(){
	socket.emit('connect player', player_info);
});

socket.on('update player', function(player){
	player_info.id = player.id;
	player_info.username = player.username;
	player_info.room = player.room;
	player_info.turn = player.turn;
	player_info.start_time = player.start_time;
	player_info.oid = player.oid;
	player_info.opponent = player.opponent;
});

socket.on('update opponent', function(player){
	player_info.start_time = player.start_time;
	player_info.opponent = player.opponent;
	player_info.oid = player.oid;
});

socket.on('update game', function(move){
	var table = document.getElementById(move.table);
	table.rows[move.y].cells[move.x].innerHTML = move.turn;
});

socket.on('wait player', function(){
	document.getElementById('gray_out').style.display = 'table';
	document.getElementById('wait_message').innerHTML = 'Waiting for Player';
});

socket.on('start game', function(){
	document.getElementById('gray_out').style.display = 'none';
	document.getElementById('wait_message').style.display = 'none';
});

socket.on('win game', function(player){
	console.log('win');
	player_info.end_time = player.end_time;
	player_info.order = player.order;
	socket.emit('update winner', player_info, function(update_complete){
		if(update_complete) window.location.replace('/win/' + player.id);
	});
});

socket.on('lose game', function(player){
	console.log('lose');
	player_info.end_time = player.end_time;
	player_info.order = player.order;
	socket.emit('update loser', player_info, function(update_complete){
		if(update_complete) window.location.replace('/lose/' + player.id);
	});
});

document.getElementById('board').addEventListener('click', function(e){
	var x = e.target.cellIndex;
	var y = e.target.parentNode.rowIndex;
	if(y==null || x==null || y==-1 || x==-1) return;
	var table = document.getElementById(e.path[3].id);
	var cell_element = table.rows[y].cells[x].innerHTML;
	var room_id = parseInt(player_info.room.replace('room_',''))

	var move_info = {
		x : x,
		y : y,
		table : e.path[3].id,
		cell : cell_element,
		turn : player_info.turn,
		room : room_id,
		id : player_info.id,
		oid : player_info.oid
	}

	socket.emit('validate move', move_info, function(move_valid){
		if(!move_valid){
			var msg = document.getElementById('turn_message');
			msg.classList.toggle("fade", false);
			msg.style.display = 'none';
    		setTimeout(function(){
    			msg.style.display = 'block';
    			msg.classList.toggle("fade", true)
    		}, 0);
		}else{
			player_info.moves++;
		} 
	})
});

function quit(){
	socket.emit('quit game', player_info);
}