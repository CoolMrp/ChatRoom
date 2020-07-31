window.onload = ()=>{
	let chat = new Chat();
	chat.init();
}
let Chat = function(){
	this.socket = null;
}
Chat.prototype = {
	init:function(){
		let info = document.getElementById("info"),//连接提示
			listTitle = document.querySelector(".list-title"),//在线列表标题
			list = document.querySelector(".list"), //在线列表
			nickWrapper = document.getElementById("nickWrapper"),//登录框
			nicknameInput = document.getElementById("nicknameInput"),//昵称输入框
			loginBtn = document.getElementById("loginBtn"), //登录按钮
			loginWrapper = document.getElementById("loginWrapper"),//遮罩层
			messageInput = document.getElementById("messageInput"),//消息输入框
			historyMsg = document.getElementById("historyMsg"), //消息展示框
			newsPane = document.getElementById("newsPane"), //消息列表
			sendBtn = document.getElementById("sendBtn"), //发送消息按钮
			imgBtn = document.getElementById("sendImage"), //发送图片按钮
			emojiSend = document.getElementById("emoji"), //表情发送按钮
			emojiWrap = document.getElementById("emojiWrapper"), //表情容器
			This = this,
			onOff = true,//在线列表开关
			pattern = []; //存放私聊用户
		this.socket = io.connect();//建立服务器连接
		this.socket.on('connect',()=>{ //监听socket的connect事件 表示已经连接
			info.innerHTML = "Please enter the nickname";
			nickWrapper.style.display = "block";
			nicknameInput.focus();
		});
		listTitle.addEventListener('click',function(e){
			if(onOff){
				list.style.display = "block";
			}else{
				list.style.display = "none";
			}
			onOff = !onOff;
			e.stopPropagation(); //阻止冒泡
		},false);
		document.body.addEventListener('click',function(e){
			var target = e.target;
			if(e.target.nodeName.toLowerCase() != "li"){
				list.style.display = "none";
				onOff = true;
			}
		},false);
		loginBtn.addEventListener('click',()=>{
			let nickname = document.getElementById("nicknameInput").value;
			if(nickname.trim().length != 0){ //str.trim() 去掉字符串两边的空格
 				This.socket.emit('nickname',nickname);
			}else{
				alert("Please enter the nickname first");
				nicknameInput.focus();
			}
		});
		//用户名存在
		this.socket.on('nickexist',()=>{
			info.innerHTML = "This nickname already exists, please change the nickname";
			nicknameInput.value = "";
			nicknameInput.focus();
		});
		//登录成功
		this.socket.on('loginSuccess',()=>{
			document.title = nicknameInput.value;
			loginWrapper.style.display = "none"; //隐藏遮罩层 显示聊天界面
			listTitle.style.display = "block";
			messageInput.focus();
		});
		this.socket.on('heartbeat',()=>{

		})
		//找人聊天
		document.querySelector(".list").addEventListener('dblclick',function(e){
			var requester = document.title; //请求发送者
			var recipient = e.target.innerHTML; //接收者
			if(requester != recipient){
				pattern = [];
				pattern.push(requester);
				pattern.push(recipient);
				loginWrapper.style.display = "block";
				info.innerHTML = "The request has been sent, waiting for the other party to agree...";
				nickWrapper.style.display = "none";
				This.socket.emit('target',requester,recipient,pattern);
				list.style.display = "none";
			}
		},false);
		//私聊模式
		this.socket.on("private",(requester,recipient,pattern1)=>{
			var invitationPane = document.getElementById("invitation");
			var me = document.title;
			if(me == recipient){
				var str = `<p>A private chat invitation from${requester}</p><p><span>Agree</span><span>Refuse</span></p>`;
				invitationPane.innerHTML = str;
				invitationPane.style.display = "block";
				invitationPane.addEventListener("click",function(e){
					var target = e.target.innerHTML;
					if(target == "Agree"){
						pattern = pattern1; //给私聊对象的pattern赋相同的值
						invitationPane.style.display = "none";
						var title = document.title;
						This.socket.emit("yes",requester,recipient,pattern);
						document.getElementById("newsPane").innerHTML = "";
						document.querySelector(".title").innerHTML = `In hot chat with 【${requester}】...`;
						document.getElementById("onlineList").style.display = "none";
						document.getElementById("status").style.display = "none";
					}else if(target=="Refuse"){
						invitationPane.style.display = "none";
						pattern = [];
						This.socket.emit("no",requester,recipient,pattern);
					}
				},false);
			}
		});
		//对方同意
		this.socket.on("yes",(requester,recipient)=>{
			if(document.title==requester){
				loginWrapper.style.display = "none";
				document.getElementById("newsPane").innerHTML = "";
				document.querySelector(".title").innerHTML = `In hot chat with 【${recipient}】...`;
				document.getElementById("onlineList").style.display = "none";
				document.getElementById("status").style.display = "none";
			}
		});
		//对方拒绝
		this.socket.on("no",(requester,recipient,pattern1)=>{
			if(document.title==requester){
				pattern = pattern1;
				info.innerHTML = "The other party rejected your invitation";
				info.style.color = "red";
				onOff = true;
				setTimeout(function(){
					info.style.color = "#fff";
					document.getElementById("loginWrapper").style.display = "none";
				},3000);
			}
		});
		//发送消息
		sendBtn.addEventListener('click',()=>{
			var value = messageInput.value;
			messageInput.value = "";//清空
			messageInput.focus();//定位焦点
			var color = document.getElementById("colorStyle").value; //获取颜色改变字体颜色
			if(value.trim().length != 0){
				This.socket.emit('newmsg',value,color,pattern); //发送到后台
				This.showMessage('me',value,color,pattern); //自己页面显示
			}
		},false);
		//发送图片
		imgBtn.addEventListener("change",function(){
			if(this.files.length !=0){
				var file = this.files[0];
				reader = new FileReader();
				if(!reader){
					this.showMessage('system','Your browser does not support this format','red',pattern);
				}
				reader.onload = (e)=>{
					this.value = "";
					This.socket.emit('img',e.target.result,pattern);
					This.showImage('me',e.target.result);
				}
				reader.readAsDataURL(file);
			}
		},false);
		//系统消息
		this.socket.on('system',(nickname,userCount,users,type)=>{
			if(pattern.length==0){
				let msg = ' ' + nickname + (type=='login'?' enter the chat room':' leave the chat room');
				This.showMessage('system', msg, 'red',pattern);//代替上面的方法
				var status = document.getElementById("status");
				status.innerHTML = `(${userCount})`;
				var listLi = list.getElementsByTagName("li");
				list.innerHTML = ""; //列表清除
				for(var i=0;i<users.length;i++){
					var li = document.createElement("li");
					li.innerHTML = users[i];
					list.appendChild(li);
				}
			}
		});
		//监听离开
		this.socket.on("leave",(leaveName)=>{
			if(pattern.length!=0){
				if(leaveName==pattern[0]||leaveName==pattern[1]){
					document.querySelector(".title").innerHTML = "The other side is off the line";
					document.querySelector(".title").style.color = "red";
				}
			}
		});
		//接收消息
		this.socket.on('newmsg',(nickname,value,color,pattern1)=>{
			var title = document.title;
			//判消息是来自群聊还是私聊
			if(pattern1.length==0){ //消息来自群聊
				if(pattern.length==0){ //当前窗口为群聊模式
					This.showMessage(nickname,value,color,pattern);
				}
			}else{//来自私聊
				if((title==pattern1[0]||title==pattern1[1])&&(nickname==pattern1[0]||nickname==pattern1[1])){
					This.showMessage(nickname,value,color,pattern1);
				}
			}
		});
		//接收图片
		this.socket.on('img',(nickname,imgData,pattern1)=>{
			var title = document.title;
			//判消息是来自群聊还是私聊
			if(pattern1.length==0){ //来自群聊
				if(pattern.length==0){ //当前为群聊模式
					This.showImage(nickname,imgData);
				}
			}else{//来自私聊
				if((title==pattern1[0]||title==pattern1[1])&&(nickname==pattern1[0]||nickname==pattern1[1])){
					This.showImage(nickname,imgData);
				}
			}
		});
		//调用下方函数初始化表情包
		this.initEmoji();
		emojiSend.addEventListener('click',(e)=>{
			emojiWrap.style.display = "block";
			e.stopPropagation(); //阻止冒泡
		});
		//点击body表情包隐藏
		document.body.addEventListener('click',(e)=>{
			var target = e.target;
			if(target != emojiWrap ){
				emojiWrap.style.display = "none";
			}
		},false);
		//选择表情功能
		emojiWrap.addEventListener('click',(e)=>{
			var target = e.target;
			if(target.nodeName.toLowerCase() == "img"){
				var value = messageInput.value;
				messageInput.focus();
				messageInput.value = `${value}[emoji:${target.title}]`;
			}
		},false);
		//回车进入界面
		nicknameInput.addEventListener('keyup',(e)=>{
			if(e.keyCode == 13){
				let nickname = document.getElementById("nicknameInput").value;
				if(nickname.trim().length != 0){
	 				This.socket.emit('nickname',nickname);
				}else{
					alert("Please enter the nickname first");
					nicknameInput.focus();
				}
			}
		},false);
		//回车键发送消息
		messageInput.addEventListener('keyup',(e)=>{
			var value = messageInput.value;
			var color = document.getElementById("colorStyle").value; //获取颜色改变字体颜色
			if(e.keyCode == 13 && value.trim().length != 0){
				This.socket.emit('newmsg',value,color,pattern); //发送到后台
				This.showMessage('me',value,color,pattern); //自己页面显示
				messageInput.value = "";//清空
				messageInput.focus();//定位焦点
			}
		},false);
		//清屏
		document.getElementById("clearBtn").addEventListener('click',()=>{
			document.getElementById("newsPane").innerHTML = "";
		},false);
		//改变背景
		document.getElementById("bgImage").addEventListener('change',function(e){
			if(this.files.length !=0){
				var file = this.files[0];
				reader = new FileReader();
				if(!reader){
					this.showMessage('system','Your browser does not support this format','red',pattern);
				}
				reader.onload = (e)=>{
					historyMsg.style.background = "url("+e.target.result+")";
					historyMsg.style.backgroundSize = "100% 100%";
				}
				reader.readAsDataURL(file);
			}
		},false);
	},
	//显示消息
	showMessage:function(user,msg,color,pattern){
		var newsPane = document.getElementById("newsPane");
		var li = document.createElement("li");
		var p1 = document.createElement("p");
		var p2 = document.createElement("p");
		var time = new Date().toTimeString().substring(0,8);
		msg = this.showEmoji(msg); //调用方法显示表情
		if(user=="system"){
			p2.innerHTML = `${user}:<span>(${time})${msg}</span>`;
		}else if(user=="me"){
			p1.className = "me";
			p2.className = "me";
			p1.innerHTML = `<span class="timespan">(${time}):${user}</span>`;
			p2.innerHTML = `<span>${msg}</span>`;
		}else{
			p1.innerHTML = `<span class="timespan">${user}:(${time})</span>`;
			p2.innerHTML = `<span>${msg}<span>`;
		}
		p2.style.color = color || "#000";
		li.appendChild(p1);
		li.appendChild(p2);
		newsPane.appendChild(li);
		historyMsg.scrollTop = historyMsg.scrollHeight - historyMsg.offsetHeight; //自动滚动
	},
	//显示图片
	showImage:function(user,imageData,color){
		var li = document.createElement("li");
		var p = document.createElement("p");
		var time = new Date().toTimeString().substring(0,8);
		if(user=="me"){ 
			p.className = "me";
			p.innerHTML = '<span class="timespan">(' + time + '): '+user+'</span> <br/>' + '<a href="' + imageData + '" target="_blank"><img src="' + imageData + '"/></a>';
		}else{
			p.innerHTML = '<span class="timespan">' + user + ':(' + time + '): </span> <br/>' + '<a href="' + imageData + '" target="_blank"><img src="' + imageData + '"/></a>';
		}
		p.style.color = color || "#000";
		li.appendChild(p);
		document.getElementById("newsPane").appendChild(li);
		historyMsg.scrollTop = historyMsg.scrollHeight - historyMsg.offsetHeight;
	},
	//初始化表情
	initEmoji:function(){
		var Fragment = document.createDocumentFragment(); //创建文档碎片节点对象 可提高性能
		for(var i=69;i>0;i--){
			var emoji = document.createElement("img");
			emoji.src = `../images/emoji/${i}.gif`;
			emoji.title = i;
			Fragment.appendChild(emoji);
		}
		document.getElementById("emojiWrapper").appendChild(Fragment);
	},
	//将数字转化为表情显示出来
	showEmoji:function(msg){
		var match,emojiIndex;
		var reg = /\[emoji:\d+\]/g;
		var maxNumber = document.getElementById("emojiWrapper").children.length;
		var result = msg;
		while(match=reg.exec(msg)){
			emojiIndex = match[0].slice(7,-1);
			if(emojiIndex>maxNumber){
				result = result.replace(match[0],"...");
			}else{
				result = result.replace(match[0],'<img src="../images/emoji/'+emojiIndex+'.gif" alt="" />');
			}
		}
		return result;
	}
}
