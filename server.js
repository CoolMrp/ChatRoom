const express = require('express'), //引入express模块
	app = express(),
	server = require('http').createServer(app); //创建服务器
app.use('/',express.static(__dirname+'/public'));//指定静态HTML文件位置
io = require('socket.io').listen(server); //引入socket并监听服务器
server.listen('999'); //监听999端口号
let users = [], //所有用户
		timer;
io.on('connection',socket=>{ //监听前端页面的连接
	socket.on('nickname',(nickname)=>{
		if(users.indexOf(nickname) > -1){ //昵称已存在
			socket.emit('nickexist');
		}else{
			socket.index = users.length;
			socket.nickname = nickname;
			users.push(nickname);
			socket.emit('loginSuccess');
			timer = setInterval(function(){
				socket.emit('heartbeat');
			},15000);
			io.sockets.emit('system',socket.nickname,users.length,users,'login');//向所有在线用户发送上线消息
		}
	});
	//将收到的消息转发出去
	socket.on('newmsg',(value,color,pattern)=>{
		socket.broadcast.emit('newmsg',socket.nickname,value,color,pattern);
	});
	//图片接受
	socket.on('img',(imgData,pattern)=>{
		socket.broadcast.emit('img',socket.nickname,imgData,pattern);
	});
	//单人模式
	socket.on('target',(requester,recipient,pattern)=>{
		socket.broadcast.emit("private",requester,recipient,pattern);
	});
	//接受请求
	socket.on('yes',(requester,recipient,pattern)=>{
		socket.broadcast.emit("yes",requester,recipient,pattern);
		var index1 = users.indexOf(requester);
		if(index1!=-1){//避免多次发送消息
			users.splice(index1,1); //用户数组中删除请求者数据
			socket.broadcast.emit('system',requester,users.length,users,'logout');
		}
		var index2 = users.indexOf(recipient);
		if(index2 != -1){//避免多次发送消息
			users.splice(index2,1); //用户数组中删除接受者数据
			socket.broadcast.emit('system',recipient,users.length,users,'logout');
		}
	});
	//拒绝请求
	socket.on('no',(requester,recipient,pattern)=>{
		socket.broadcast.emit("no",requester,recipient,pattern);
	});
	//断开连接
	socket.on('disconnect',()=>{
		var index = users.indexOf(socket.nickname);
		if(index>=0){  //离开用户为群聊用户
			users.splice(index,1); //用户数组中删除数据
			clearInterval(timer);
			socket.broadcast.emit('system',socket.nickname,users.length,users,'logout');//通知除自己以外的所有人自己离开
		}else{ //若此离开用户为私聊用户,不必再次发送退出信息到群聊
			socket.broadcast.emit('leave',socket.nickname); //向好友发送离线消息
		}
	});
});