$('#form').submit(function(e){
	e.preventDefault ? e.preventDefault() : (e.returnValue = false);
	var data = {};
	$('input').each(function(){
		data[$(this).attr('name')] = $(this).val();
	});
	var posting = $.post($(this).attr('action'), data);
	posting.done(function(res){
		switch(res.msg){
			case 'user does not exist':
				$('#error_msg').html('user does not exist');
				$('input[name=username], input[name=password]').val('');
				break;
			case 'incorrect credentials':
				$('#error_msg').html('username or password is incorrect');
				$('input[name=username], input[name=password]').val('');
				break;
			case 'user already exists':
				$('#error_msg').html('username is already taken');
				$('input[name=username]').val('');
				break;
			case 'user already signed in':
				$('#error_msg').html('user is already signed in');
				$('input[name=username], input[name=password]').val('');
				break;
			case 'login success':
				window.location.replace('/landing/' + res.data);
				break;
			case 'register success':
				window.location.replace('/');
				break;
		}
	});
});