 /**
 *  use global variable:username and address
 *
 */

 $(function() {
      var FADE_TIME = 150; // ms
      var TYPING_TIMER_LENGTH = 400; // ms
      var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
      ];

      // Initialize varibles
      var $window = $(window);
      var $messages = $('.messages'); // Messages area
      var $inputMessage = $('.inputMessage'); // Input message input box

      var $chatPage = $('.chat.page'); // The chatroom page

      // Prompt for setting a username
      var typing = false;
      var lastTypingTime;

      var socket = io.connect( address || 'http://localhost:3000');

      if(username){
        socket.emit('add user', username);
      }

      function addParticipantsMessage (data) {
        var message = '';
        if (data.numUsers === 1) {
          message += "只有一个人在线";
        } else {
          message += "有 " + data.numUsers + " 人在线";
        }
        log(message);
      }

      // Sends a chat message
      function sendMessage () {
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message) {
          $inputMessage.val('');
          addChatMessage({
            username: username,
            message: message
          });
          // tell server to execute 'new message' and send along one parameter
          socket.emit('new message', message);
        }
      }

      // Log a message
      function log (message, options) {
        var el = '<li class="log">' + message + '</li>';
        addMessageElement(el, options);
      }

      // Adds the visual chat message to the message list
      function addChatMessage (data, options) {
        // Don't fade the message in if there is an 'X was typing'
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
          options.fade = false;
          $typingMessages.remove();
        }
        var colorStyle = 'style="color:' + getUsernameColor(data.username) + '"';
        var usernameDiv = '<span class="username"' + colorStyle + '>' +
          data.username + '</span>';
        var messageBodyDiv = '<span class="messageBody">' +
          data.message + '</span>';

        var typingClass = data.typing ? 'typing' : '';
        var messageDiv = '<li class="message ' + typingClass + '">' +
        usernameDiv + messageBodyDiv + '</li>';
        var $messageDiv = $(messageDiv).data('username', data.username);

        addMessageElement($messageDiv, options);
      }

      // Adds the visual chat typing message
      function addChatTyping (data) {
        data.typing = true;
        data.message = '正在输入';
        addChatMessage(data);
      }

      // Removes the visual chat typing message
      function removeChatTyping (data) {
        getTypingMessages(data).fadeOut(function () {
          $(this).remove();
        });
      }

      // Adds a message element to the messages and scrolls to the bottom
      // el - The element to add as a message
      // options.fade - If the element should fade-in (default = true)
      // options.prepend - If the element should prepend
      //   all other messages (default = false)
      function addMessageElement (el, options) {
        var $el = $(el);

        // Setup default options
        if (!options) {
          options = {};
        }
        if (typeof options.fade === 'undefined') {
          options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
          options.prepend = false;
        }

        // Apply options
        if (options.fade) {
          $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
          $messages.prepend($el);
        } else {
          $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
      }

      // Prevents input from having injected markup
      function cleanInput (input) {
        return $('<div/>').text(input).html() || input;
      }

      // Updates the typing event
      function updateTyping () {
          if (!typing) {
            typing = true;
            socket.emit('typing');
          }
          lastTypingTime = (new Date()).getTime();

          setTimeout(function () {
            var typingTimer = (new Date()).getTime();
            var timeDiff = typingTimer - lastTypingTime;
            if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
              socket.emit('stop typing');
              typing = false;
            }
          }, TYPING_TIMER_LENGTH);
      }

      // Gets the 'X is typing' messages of a user
      function getTypingMessages (data) {
        return $('.typing.message').filter(function (i) {
          return $(this).data('username') === data.username;
        });
      }

      // Gets the color of a username through our hash function
      function getUsernameColor (str) {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < str.length; i++) {
           hash = str.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
      }

      // Keyboard events

      $window.keydown(function (event) {
        // Auto-focus the current input when a key is typed
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
          if (username) {
            sendMessage();
            socket.emit('stop typing');
            typing = false;
          } else {
            alert('userName is null')
          }
        }
      });

      $inputMessage.on('input', function() {
        updateTyping();
      });

      // Click events

      // Focus input when clicking on the message input's border
      $inputMessage.click(function () {
        $inputMessage.focus();
      });

      // Socket events

      // Whenever the server emits 'login', log the login message
      socket.on('login', function (data) {
        // Display the welcome message
        var message = "欢迎来到聊天室";
        log(message, {
          prepend: true
        });
        addParticipantsMessage(data);
      });

      // Whenever the server emits 'new message', update the chat body
      socket.on('new message', function (data) {
        addChatMessage(data);
      });

      // Whenever the server emits 'user joined', log it in the chat body
      socket.on('user joined', function (data) {
        log(data.username + ' 加入了');
        addParticipantsMessage(data);
      });

      // Whenever the server emits 'user left', log it in the chat body
      socket.on('user left', function (data) {
        log(data.username + ' 离开了');
        addParticipantsMessage(data);
        removeChatTyping(data);
      });

      // Whenever the server emits 'typing', show the typing message
      socket.on('typing', function (data) {
        addChatTyping(data);
      });

      // Whenever the server emits 'stop typing', kill the typing message
      socket.on('stop typing', function (data) {
        removeChatTyping(data);
      });
    });