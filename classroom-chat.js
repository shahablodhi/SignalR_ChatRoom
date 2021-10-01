//Declarations
var chatMeta = JSON.parse(localStorage.getItem('init-chat'));
//Declarations End


///Functions////////
function playNotificationSound(url) {
    const audio = new Audio(url);
    audio.play();
}

function toggleChat() {
    var chatWidth = $('.chat-window').width()
    if (between(chatWidth, 0, 10)) {
        openClassroomChat();
    } else {
        closeClassroomChat();
    }
}

function between(x, min, max) {
    return x >= min && x <= max;
}

function closeClassroomChat() {
    updateChatStateOnLocalStorage(false);
    $('#container-unread-msg').css('left', '0');
    //we need to show the notification container
    //becuz we want a transition effect fly from left
    //on new messages
    $('#container-unread-msg').css('background', 'white');
    setTimeout(function () { $('#container-unread-msg').show(); }, 500)
    $("#close-chat").hide();
    $("#open-chat").show();
    $('.chat-window').width(-2);
    $('.chat-window').removeClass('chat-border');
}

function openClassroomChat() {
    updateChatStateOnLocalStorage(true);
    $('#container-unread-msg').css('left', '0');
    $('#container-unread-msg').hide();
    $('.chat-window').show();
    $("#close-chat").show();
    $("#open-chat").hide();
    $('.chat-window').width('300px');
    $('.chat-window').addClass('chat-border');
    scrollToBottom();
    setTimeout(markThemReadMessages, 2000);
}

function greyoutunreadMessages() {
    var unreadMessages = $('#discussion > div').slice(-(getUnreadMessageCount()));
    for (var i = 0; i < unreadMessages.length; i++) {
        $(unreadMessages[i]).css('background', 'lightgrey');
    }
}

function markThemReadMessages() {
    var unreadMessages = $('#discussion > div').slice(-(getUnreadMessageCount()));
    for (var i = 0; i < unreadMessages.length; i++) {
        $(unreadMessages[i]).css('background', 'white');
    }
    resetUnreadMessages();
}

function handleUnreadMessages() {
    incrementUnreadMessages();
    $("#unread-msg-count").text(getUnreadMessageCount());
    $('#container-unread-msg').css('background', '#2b7ee1');
    $('#container-unread-msg').css('left', '-1.9rem');
    playNotificationSound('/Content/Skins/Sound/Notification.mp3');
    greyoutunreadMessages();
}

function scrollToBottom() {
    var discussion = document.getElementById("discussion");
    discussion.scrollTop = discussion.scrollHeight;
}

function updateChatStateOnLocalStorage(isOpen = true) {
    var chatMetaTemp = JSON.parse(localStorage.getItem('init-chat'));
    chatMetaTemp.isChatAreaOpen = isOpen;
    localStorage.setItem('init-chat', JSON.stringify(chatMetaTemp));
}

function isClassroomChatClosed() {
    return JSON.parse(localStorage.getItem('init-chat')).isChatAreaOpen === false;
}

function incrementUnreadMessages() {
    var chatMetaTemp = JSON.parse(localStorage.getItem('init-chat'));
    chatMetaTemp.unReadMessages++
    localStorage.setItem('init-chat', JSON.stringify(chatMetaTemp));
}

function resetUnreadMessages() {
    var chatMetaTemp = JSON.parse(localStorage.getItem('init-chat'));
    chatMetaTemp.unReadMessages = 0;
    localStorage.setItem('init-chat', JSON.stringify(chatMetaTemp));
}

function getUnreadMessageCount() {
    return JSON.parse(localStorage.getItem('init-chat')).unReadMessages;
}

// This optional function html-encodes messages for display in the page.
function htmlEncode(value) {
    var encodedValue = $('<div />').text(value).html();
    return encodedValue;
}

function getClassroomChatState() {
    if (localStorage.getItem('showClassroomChat') === null) {
        return false;
    }
    return localStorage.getItem('showClassroomChat');
}

function continueClassroomChat() {

    var chat = $.connection.chatHub;
    // Create a function that the hub can call back to display messages.
    chat.client.send = function (name, message, timestamp) {
        // Add the message to the page.
        AppendChatMessage(name, message, timestamp)
        scrollToBottom();
        if (isClassroomChatClosed()) {
            handleUnreadMessages();
        }
    };
    chat.client.joined = function (name, message) {
        // Add the message to the page.
        AppendChatMessage();
        if (isClassroomChatClosed()) {
            handleUnreadMessages();
        }
    };

    if ($.connection.hub.state === $.signalR.connectionState.disconnected) {
        $.connection.hub.start().done(function () {
            openClassroomChat();
        });
    }

    chat.connection.qs = {
        'username': chatMeta.email,
        'classroomcode': chatMeta.classroomCode
    };


    //On enter
    $("#chat-textarea").keyup(function (event) {
        if (event.keyCode === 13) {
            var chatTextArea = $("#chat-textarea").val();
            //check if only enter being sent, remove it, after its used
            if (chatTextArea === '\n') {
                $("#chat-textarea").val('');
            }

            //check if only spaces being sent, remove them
            if (!chatTextArea.replace(/\s/g, '').length) {
                $("#chat-textarea").val('');
            }
            $("#grp-chat-send").click();
        }
    });

    $('#grp-chat-send').click(function () {
        // Call the Send method on the hub.
        var chatTextArea = $("#chat-textarea").val();
        if (!chatTextArea.replace(/\s/g, '').length) {
            $("#chat-textarea").val('');
        }
        if ($("#chat-textarea").val() === '') {
            return;
        }
        //chat.server.sendInGroup(chatMeta.classroomCode, userIdentity + (chatMeta.isInstructor == 1 ? '(inst)' : ''), $("#chat-textarea").val());
        chat.server.sendInGroup(chatMeta.classroomCode, userIdentity, $("#chat-textarea").val());
        $("#chat-textarea").val('');
    });

    $.connection.hub.disconnected(function () {
        setTimeout(function () {
            $.connection.hub.start().done(function () {
                console.log('connection restarted...');
            });
        }, 2000); // Restart connection after 2 seconds.
    });

}

function AppendChatMessage(name, message, timestamp) {
    $('#discussion').append('<div class="message-container"><span style = "font-weight: 600;">' + htmlEncode(name) + ': </span><span style="padding-left: 1px;word-break: break-word;">' + htmlEncode(message) + '</span> <div style="width: 100 %;font-size: 10px;font-weight: 700;opacity: 0.4;" class="text-center"><span>' + formatDate(new Date(dateTimeReviver('', timestamp))) + '</span></div></div>');
    scrollToBottom();
}

function getChatHistoryAndInitClassroomChat() {
    $.ajax({
        url: "/ClassroomChat/GetClassroomChatHistory?classroomCode=" + chatMeta.classroomCode,
        method: "GET",
        success: function (data) {
            HandleChatResponse(data);
            continueClassroomChat();
        },
        error: function (data) {

        }
    });
}

function HandleChatResponse(data) {
    for (var i = 0; i < data.message.length; i++) {
        AppendChatMessage(data.message[i].Name, data.message[i].Message, data.message[i].CreatedDate);
    }
}

function formatDate(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
}

dateTimeReviver = function (key, value) {
    var a;
    if (typeof value === 'string') {
        a = /\/Date\((\d*)\)\//.exec(value);
        if (a) {
            return new Date(+a[1]);
        }
    }
    return value;
}

function setClassroomChatState(showChat) {
    localStorage.setItem('showClassroomChat', showChat);
}

function GetClassroomStateFromServer() {
    $.ajax({
        url: "/LabMenu/GetLpMeta",
        type: "GET",
        async: false,
        contentType: "application/json",
        success: function (resp) {
            if (resp.success = true) {
                //NoTextNoClassroom
                if (resp.result.LPHeaderTextState == 0) {
                    setClassroomChatState(false);
                }
                //Customtext
                else if (resp.result.LPHeaderTextState == 1 || resp.result.LPHeaderTextState == 2) {
                    setClassroomChatState(true);
                }
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
}

function GetClassroomChatMeta() {
    $.ajax({
        url: "/ClassroomChat/GetClassroomChatMetaForThisUser",
        type: "GET",
        async: false,
        contentType: "application/json",
        success: function (resp) {
            if (resp && resp.success === true && resp.result !== "") {
                setChatMeta(resp.result);
            }
            else {
                console.log(resp.result);
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
}

function setChatMeta(meta) {
    var classroomChatMeta = {
        fullName: meta.FullName,
        classroomCode: meta.ClassroomCode,
        email: meta.Email,
        isInstructor: meta.IsInstructor,
        classroomName: meta.ClassroomName,
        isChatAreaOpen: true,
        unReadMessages: 0
    };
    localStorage.setItem('init-chat', JSON.stringify(classroomChatMeta));

    //ensuring that fresh value takes place
    chatMeta = JSON.parse(localStorage.getItem('init-chat'));
}

function hideClassroomChat() {
    $('.chat-window').hide();
}

function isAccessCodePage() {
    if (window.location.href.indexOf("/AccessCodes") > -1
        || window.location.href.indexOf("/AddLabCode") > -1) {
        return true;
    }

    return false;
}

function GetClassroomChatHistoryInBootBox(clasroomCode) {
    $.ajax({
        url: "/ClassroomChat/GetClassroomChatHistory?classroomCode=" + clasroomCode,
        method: "GET",
        success: function (data) {
            handleChatResponseInBootBox(data)
        },
        error: function (data) {
            bootbox.alert("Sorry! Can't get the classroom chat");
        }
    });
}

function getChatExpiryDate() {

    var chatExpiresOn = getDateFromUStoUKFormat($('#end-date').text());
    if (chatExpiresOn != "Invalid Date") {
        return chatExpiresOn.toLocaleString('en-us', { weekday: 'long' }) + ' ' + chatExpiresOn.toLocaleDateString()
    }
    else {
        return '';
    }
}

function getDateFromUStoUKFormat(date) {
    var dateSplitted = date.split(' ')[0].split('/');
    var day = dateSplitted[0];

    // in JS months starts from 0 not 1
    var month = dateSplitted[1] - 1;
    var year = dateSplitted[2];

    return new Date(year, month, day);
}

function handleChatResponseInBootBox(data) {
    for (var i = 0; i < data.message.length; i++) {
        AppendChatMessage(data.message[i].Name, data.message[i].Message, data.message[i].CreatedDate);
    }

    var discussion = $('#discussion').html();
    var expiresOn = getChatExpiryDate();
    bootbox.dialog({
        title: 'Classroom chat is available till ' + (expiresOn === '' ? '30 days after classroom expires' : expiresOn),
        message: "<div id='discussion' style='height: 30rem;overflow: auto;'>" + discussion + "</<div>",
        size: 'large',
        buttons: {
            ok: {
                label: "Close",
                className: 'btn-info'
            }
        }
    });
}

//Checks if it is allowed from Global Settings. Checks if chat is Turned off or On
function IsChatAllowedForAll() {
    var isAllowed = false;
    $.ajax({
        url: "/Settings/GetClassroomChatPermission",
        type: "GET",
        async: false,
        contentType: "application/json",
        success: function (resp) {
            if (resp && resp.Value === '1') {
                isAllowed = true;
            }
            else {
                isAllowed = false;
                hideClassroomChat();
            }
        },
        error: function (err) {
            console.log(err);
        }
    });
    return isAllowed;
}

function isSpinnerPage() {
    if ($('#is-spinner').length > 0) {
        return true;
    }
}

function isDetachedPage() {

    if (typeof isdetached === 'undefined' || isdetached === null || isdetached === 'false') {
        return false;
    }
    return true;
}

function AllowAccess() {
    var allowAccess = true;
    hideClassroomChat();

    //don't initiate if chat is turned off from DB
    if (IsChatAllowedForAll()) {
        allowAccess = true;
    }

    //hide for spinner page
    if (isSpinnerPage()) {
        allowAccess = false;
    }

    if (isDetachedPage()) {
        allowAccess = false;
    }
    return allowAccess;
}

function createChatContainer() {
    var chatContainer = $('<div />').appendTo('body');
    chatContainer.attr('id', 'chat-container');
}

function setChatHeader() {
    $("#chat-header").text(chatMeta.classroomName)
}

//document ready
$(function () {
    if (!AllowAccess()) {
        return;
    }

    createChatContainer();
    $('#chat-container').load('/Content/Templates/chatWindowTemplate.html', function () {
        GetClassroomStateFromServer();
        GetClassroomChatMeta();
        var shouldInitChat = getClassroomChatState();
        if (JSON.parse(shouldInitChat)) {
            getChatHistoryAndInitClassroomChat();
            setChatHeader();
        }
    });
});
