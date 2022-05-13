import '../node_modules/simplemde/dist/simplemde.min.css';
import './edit.css';

import $ from 'jquery';
import SimpleMDE from 'simplemde';
import Sortable from 'sortablejs';

import { marked } from 'marked';

marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: function(code, lang) {
      const hljs = require('highlight.js');
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-', // highlight.js css expects a top-level 'hljs' class.
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false
  });
    
    var edit_mode = false;
    var NOTEID=0;
    var NoteAutosaving = false;
    var NoteAutosaveWaiting = false;
    var noteContextID = 0;
    var notebook_id = 0;
    



    var simplemde = new SimpleMDE({ 
        element: document.getElementById("source"),
        previewRender: function(plainText, preview) { // Async method
            setTimeout(function(){
                preview.innerHTML = marked.parse(plainText);
            }, 250);
    
            return "Loading...";
        },
        forceSync: true,
        autofocus: true,
        hideIcons: ["preview"],
        status: false,
        showIcons: ['strikethrough','clean-block','horizontal-rule',"code", "table"],
    });

function convertDate(unixTime){
    var unixTimestamp = new Date(unixTime * 1000);
    var text = unixTimestamp.toLocaleString();
    if(text == "Invalid Date"){
        text = "Unknown"
    }
    return text;
}


function doLayout(){
    var winh=window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight;

    var winw=window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth;

    $("#content").height(winh-100);
    $("#toolbar").height(winh-100);
    $("#sidebar").height(winh-100);
    $("#editor").height(winh-100);

    $("#editor").width(winw-288);

    if(edit_mode){
        document.getElementById("editor-move").style.left  = (winw-240)/2 + "px";
        document.getElementById("editor-ace").style.width = (winw-240)/2 + "px";
        document.getElementById("editor-show").style.width = (winw-240)/2 - 53 + "px";
        document.getElementById("editor-show").style.marginLeft = (winw-240)/2 + 5 + "px";
        document.getElementById("editor-move").style.display = "block";
        document.getElementById("editor-ace").style.display = "block";
    } else {
        document.getElementById("editor-move").style.display = "none";
        document.getElementById("editor-ace").style.display = "none";
        document.getElementById("editor-show").style.width = "auto";
        document.getElementById("editor-show").style.marginLeft = "0px";
    }

}

window.onresize = function () {
    doLayout();
}

$('body').on('click','[title="Edit Mode"]',function(e){
    e.preventDefault();
    edit_mode = !edit_mode;
    if(edit_mode){
        loadNote(NOTEID);
    }
    doLayout();

    simplemde.codemirror.refresh();
});

function loadNotelist(){
    $.post("edit.php",{
        action:"getNotelist"
    },
    function(data,status){
        $("#sidebar-notelist").html(data);
        var notelist = document.getElementById("sidebar-notelist");

        // list 1: notes in list
        Sortable.create(notelist, {
            group: {
              name: "notelist",
              put: ["notebooklist", "sublist"],
              pull:true
            },
            ghostClass: 'notelist-item-moving',
            animation: 150,
            draggable: ".notelist-item-single",
            onSort: function(evt){
                updateList();
            }
        });

        // list 2: notebooks in list
        Sortable.create(notelist, {
            group: {
              name: "notebooklist",
              put: ["notelist", "sublist"],
              pull:true
            },
            ghostClass: 'notelist-item-moving',
            animation: 150,
            draggable: ".notelist-folder",
            onSort: function(evt){
                updateList();
            }
        });

        // other lists: notes in each notebooks
        $("#sidebar-notelist .notelist-folder").each(function(){
            Sortable.create(this, {
                group: {
                  name: "sublist",
                  put: ["notelist"],
                  pull:true
                },
                ghostClass: 'notelist-item-moving',
                animation: 150,
                draggable: ".notelist-item-subnote",
                onSort: function(evt){
                    updateList();
                }
            });
        });

        $("#sidebar-notelist").on('contextmenu','.notelist-item-single',function(event) {
            event.preventDefault();
            showContextMenu(this, event, 'note');
        });
        $("#sidebar-notelist").on('contextmenu','.notelist-item-subnote',function(event) {
            event.preventDefault();
            showContextMenu(this, event, 'note');
        });

        $("#sidebar-notelist").on('contextmenu','.notelist-item-notebook-title',function(event) {
            event.preventDefault();
            showContextMenu(this, event, 'notebook');
        });

        //re-select current note if has
        if(NOTEID){
            $("#notelist-item-"+NOTEID).addClass("notelist-item-selected2");
            if($("#notelist-item-"+NOTEID).hasClass("notelist-item-subnote")){
                $("#notelist-item-"+NOTEID).parent().children(".notelist-item-notebook-title").addClass("notelist-item-selected");
            }
        }
    });
}

function updateList(){
    var theList = $("#sidebar-notelist");

    theList.children(".notelist-item-subnote").addClass("notelist-item-single");
    theList.children(".notelist-item-subnote").removeClass("notelist-item-subnote");

    theList.children(".notelist-folder").children(".notelist-item-single").addClass("notelist-item-subnote");
    theList.children(".notelist-folder").children(".notelist-item-single").removeClass("notelist-item-single");

    if($("#notelist-item-"+NOTEID).hasClass("notelist-item-subnote")){
        $("#notelist-item-"+NOTEID).parent().parent().children(".notelist-folder").children(".notelist-item-notebook-title").removeClass("notelist-item-selected");
        $("#notelist-item-"+NOTEID).parent().children(".notelist-item-notebook-title").addClass("notelist-item-selected");
    }else{
        $("#notelist-item-"+NOTEID).parent().children(".notelist-folder").children(".notelist-item-notebook-title").removeClass("notelist-item-selected");
    }

    var newList = new Array();

    theList.children().each(function(){
        if( $(this).hasClass("notelist-item-single") ){
            if($(this).attr("id")){
                newList.push(parseInt( $(this).attr("id") ));
            }
        }
        if( $(this).hasClass("notelist-folder") ){
            var tmp = new Array();
            tmp.push( $(this).attr('title') );
            $(this).children(".notelist-item-subnote").each(function(){
                tmp.push(parseInt( $(this).attr("id").substring(14) ));
            });
            newList.push(tmp);
        }
    });

    var newListJSON = JSON.stringify(newList);
    // alert(newListJSON);

    $.post("include/note.php",{
        action:"updateNoteList",
        list:newListJSON
    },
    function(data,status){
        // alert("Status: " + status + data );
    });

}

function newNote(){
    var newname = prompt();
    if(newname == null){
        return 1;
    }

    $.post("include/note.php",{
        action:"newNote",
        title:newname
    },
    function(data,status){
        loadNotelist();
    });
}

$('body').on('click','.notelist-newNote',newNote);


function newNoteBelow(){
    var newname = prompt();
    if(newname == null){
        return 1;
    }

    $.post("include/note.php",{
        action:"newNoteBelow",
        id:NOTEID,
        title:newname
    },
    function(data,status){
        loadNotelist();
    });
}


$('[title="New Note"]').on('click',newNoteBelow);

function newSubnote(notebook){
    var newname = prompt();
    if(newname == null){
        return 1;
    }

    $.post("include/note.php",{
        action:"newSubnote",
        notebook:notebook,
        title:newname
    },
    function(data,status){
        loadNotelist();
    });
}
$('body').on('click','.notelist-item-subnote2',function(e){
    e.preventDefault();
    var notebook = $(this).attr('data-note');
    newSubnote(notebook)
});

function loadNote(id){
    updateStatusBar("#f1c40f", "Loading note...");
    if(NOTEID){
        if(NOTEID == id){
            updateStatusBar("#0f2", "Note loaded");
            return 0;
        }
        $("#notelist-item-"+NOTEID).removeClass("notelist-item-selected2");
        if($("#notelist-item-"+NOTEID).hasClass("notelist-item-subnote")){
            if( $("#notelist-item-"+NOTEID).parent() !=  $("#notelist-item-"+id).parent() ){
                $("#notelist-item-"+NOTEID).parent().children(".notelist-item-notebook-title").removeClass("notelist-item-selected");
            }
        }
    }
    NOTEID=id;
    $("#notelist-item-"+NOTEID).addClass("notelist-item-selected2");
    if($("#notelist-item-"+NOTEID).hasClass("notelist-item-subnote")){
        $("#notelist-item-"+NOTEID).parent().children(".notelist-item-notebook-title").addClass("notelist-item-selected");
    }
    NoteLoding=true;
    $.post("include/note.php",{
        action:"getNote",
        id:id
    },
    function(data,status){
        // alert("Status: " + status + data );
        simplemde.value(data);
        $('#source').val(data);
        updateEditorShow();
        updateStatusBar("#0f2", "Note loaded");

        NoteLoding=false;
    });
}
$('body').on('click','.notelist-load-note',function(e){
    e.preventDefault();
    var id = $(this).attr('data-note-id');
    loadNote(id);
});

function getNoteSettings(id){
    updateStatusBar("#f1c40f", "Loading properties...");
    $.post("include/note.php",{
        action:"getNoteSettings",
        id:id
    },
    function(data,status){
        updateStatusBar("#0f2", "Properties loaded");
        showProperties(id, data);
    });
}

function presentNote(id){
    var url = 'presentation.php?note=' + id;
    window.open(url, '_blank').focus();
}

function renameNote(id,item){
    var title = $(item).attr('title');
    
    var newname = prompt('New Name',title);
    if(newname == null){
        return 1;
    }

    updateStatusBar("#f1c40f", "Rename note...");
    $.post("include/note.php",{
        action:"renameNote",
        newname:newname,
        id:id
    },
    function(data,status){
        // alert("Status: " + status + data );
        loadNotelist();
        updateStatusBar("#0f2", "Note Renamed");
    });
}


function autosaveNote(){
    if(NOTEID){
        if(!NoteAutosaving){
            NoteAutosaving = true;
            setTimeout(function(){
                NoteAutosaving = false;
                if(NoteAutosaveWaiting){
                    NoteAutosaveWaiting = false;
                    autosaveNote();
                }
            }, 500);
            updateStatusBar("#f1c40f", "Saving...");
            $.post("include/note.php",{
                action:"saveNote",
                id:NOTEID,
                content:simplemde.value()
            },
            function(data,status){
                // alert("Status: " + status + data );
                hideNotsaveLable();
                updateStatusBar("#0f2", "Note saved");
            });
        }else{
            NoteAutosaveWaiting = true;
        }
    }
}

function saveNote(){
    if(NOTEID){
        updateStatusBar("#f1c40f", "Saving...");
        $.post("include/note.php",{
            action:"saveNote",
            id:NOTEID,
            content:simplemde.value()
        },
        function(data,status){
            // alert("Status: " + status + data );
            hideNotsaveLable();
            updateStatusBar("#0f2", "Note saved");
        });
    }
}

$('[title="Save"]').on('click',saveNote);
function cloneNote(id){
    updateStatusBar("#f1c40f", "Cloning...");
    $.post("include/note.php",{
        action:"cloneNote",
        id:id
    },
    function(data,status){
        // alert("Status: " + status + data );
        loadNotelist();
        updateStatusBar("#0f2", "Note cloned");
    });
}


function delNote(id){
    $.post("include/note.php",{
        action:"delNote",
        id:id
    },
    function(data,status){
        // alert("Status: " + status + data );
        loadNotelist();
        if(NOTEID == id){
            var data = 'Please select a __note__ in the list on the left.';
            simplemde.value(data);
            updateEditorShow();
            simplemde.codemirror.refresh();
        }


    });
}

function delNotebook(notebook){
    $.post("include/note.php",{
        action:"delNotebook",
        notebook:notebook
    },
    function(data,status){
        // alert("Status: " + status + data );
        loadNotelist();
    });
}

function showNotebookDelIcon(item){
    if($(item).parent().children(".notelist-item").size()==2){
        // $(item).find(".i-notelist-item-del").show();
    }
}

function hideNotebookDelIcon(item){
    $(item).find(".i-notelist-item-del").hide();
}

function toggleNotebook(item){

    if($(item).hasClass("notebook-opened")){
        $(item).parent().animate({height:"32px"});
        $(item).parent().children("i").animate({rotation: -90});
    }else{
        $(item).parent().animate({height:$(item).parent().children(".notelist-item").length*32+"px" });
        $(item).parent().children("i").animate({rotation: 0});
    }
    $(item).toggleClass("notebook-opened");
}
$('body').on('click','.notebook-toggleNotebook',function(e){
    e.preventDefault();
    toggleNotebook(this);
});

function showProperties(id, notesettings){
    var winh=window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight;

    var winw=window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth;

    notesettings = JSON.parse(notesettings);
    $("#sidebar-properties-header-notename").html(notesettings['title']);
    $("#sidebar-properties-header-notetype").html("Markdown Note");

    $("#sidebar-properties-body-name").html(notesettings['title']);
    $("#sidebar-properties-body-lastmodify").html(convertDate(notesettings['lastmodify']));
    $("#sidebar-properties-body-lastaccess").html(convertDate(notesettings['lastaccess']));

    $("#sidebar-properties").css("left", winw+'px');
    $("#sidebar-properties").show(function(){
        $("#sidebar-properties").animate({left: winw-300+'px'},200);
        $("#page-glass").fadeIn(200);
    });

}

function hideProperties(){
    var winh=window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight;

    var winw=window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth;
    $("#sidebar-properties").animate({left: winw+'px'},200,function(){
        $("#sidebar-properties").hide();
    });
    $("#page-glass").fadeOut(200);

}
$('body').on('click','#page-glass',hideProperties);

function showNotsaveLable(){
    if(NOTEID){
        $("#float-notsaved-lable").show();
    }
}

function hideNotsaveLable(){
    $("#float-notsaved-lable").hide();
}

function updateEditorShow(){
    document.getElementById("editor-show").innerHTML = marked.parse(simplemde.value());
}

function updateStatusBar(color, text){
    document.getElementById("sidebar-status-icon").style.color = color;
    document.getElementById("sidebar-status-text").innerHTML = text;
}

function showContextMenu(item, event, context_type){
    var e = event || window.event;
    
    if(noteContextID){
        $("#notelist-item-"+noteContextID).removeClass("notelist-item-contextmenu-show");
        noteContextID = 0;
    }
    if(notebook_id){
        $('.notelist-item-notebook-title[title="'+notebook_id+'"]').removeClass("notebook-contextmenu-show");
        notebook_id = 0;
    }

    var note_context = $("#contextmenu-1");
    note_context.hide();

    var notebook_context = $("#contextmenu-2");
    notebook_context.hide();

    if(context_type == 'notebook'){
        notebook_context.show(150);
        $("#contextmenu-2").css({
            "top" : e.clientY+'px',
            "left" : e.clientX+'px'
        });
        notebook_id = $(item).attr("title");
        $(item).addClass("notebook-contextmenu-show");
    } else {
        note_context.show(150);
        $("#contextmenu-1").css({
            "top" : e.clientY+'px',
            "left" : e.clientX+'px'
        });
        noteContextID = parseInt($(item).attr("id").substring(14));
        $(item).addClass("notelist-item-contextmenu-show");
    }


}

function noteContextClick(operation, item){
    switch(operation){
        case "open":
            loadNote(noteContextID, item);
            break;
        case "rename":
            renameNote(noteContextID, item);
            break;
        case "clone":
            cloneNote(noteContextID, item);
            break;
        case "share":

            break;
        case "export":

            break;
        case "delete":
            if(confirm("Delete this note?")){
                delNote(noteContextID, item);
            }
            break;
        case "present":
            presentNote(noteContextID, item);
            break;
        case "properties":
            getNoteSettings(noteContextID, item);
            break;
    }
    $("#contextmenu-1").hide(150);
    if(noteContextID){
        $("#notelist-item-"+noteContextID).removeClass("notelist-item-contextmenu-show");
        noteContextID = 0;
    }
}

$('body').on('click','.contextmenu-item',function(e){
    e.preventDefault();
    var operation = $(this).attr('data-operation');
    noteContextClick(operation,this);
});

function renameNotebook(id,item){
    var title = $(item).attr('title');
    
    var newname = prompt('New Name',title);
    if(newname == null){
        return 1;
    }

    var $note_folder = $('.notelist-item-notebook-title[title="'+id+'"]');
    $note_folder.find('.notebook_name').text(newname);
    $note_folder.attr('title',newname).removeClass("notebook-contextmenu-show");
    updateList();
    notebook_id = newname;
}

function noteBookContextClick(operation, item){
    switch(operation){
        case "rename_notebook":
            renameNotebook(notebook_id,item);
            break;
        case "delete_notebook":
            console.log(item);
            break;
        case "notebook_properties":
            console.log(item);
            break;
    }
    $("#contextmenu-2").hide(150);
    if(notebook_id){
        $('.notelist-item-notebook-title[title="'+notebook_id+'"]').removeClass("notebook-contextmenu-show");
        notebook_id = 0;
    }
}

$('body').on('click','.notebook-contextmenu-item',function(e){
    e.preventDefault();
    var operation = $(this).attr('data-operation');
    noteBookContextClick(operation,this);
});

function newNotebook(){
    var newname = prompt();
    if(newname == null){
        return 1;
    }

    $.post("include/note.php",{
        action:"newNotebook",
        notebook:newname
    },
    function(data,status){
        loadNotelist();
    });
}
$('body').on('click','[title="New Notebook"]',newNotebook);

    var NoteLoding=false;

    loadNotelist();
    doLayout();
    updateStatusBar("#bdc3c7", "Ready");

    $("#btn-newnote").click(function(){
        $.post("include/note.php",{
            action:"newNote",
            title:$("#input-newnote").val()
        },
        function(data,status){
            // alert("Status: " + status + data );
            loadNotelist();
        });
    });

    $("#btn-newnotebook").on('click',newNotebook);

    $("#btn-subnote").click(function(){
        $.post("include/note.php",{
            action:"newSubnote",
            notebook:$("#input-subnote-book").val(),
            title:$("#input-subnote-note").val()
        },
        function(data,status){
            // alert("Status: " + status + data );
            loadNotelist();
        });
    });

    document.onclick=function(event){
        var e = event || window.event;
        var doHide = true;
        $(".contextmenu").each(function(){
            var contextmenuPos = $(this).offset();
            if( contextmenuPos.left <= e.clientX && e.clientX <= contextmenuPos.left+$(this).width() &&
                contextmenuPos.top <= e.clientY && e.clientY <= contextmenuPos.top+$(this).height() ){
                doHide = false;
            }
            // alert(contextmenuPos.x+"px "+contextmenuPos.y+"px "+e.clientX+"px "+e.clientY+"px ");
        });


        if(doHide){
            if(noteContextID){
                $("#notelist-item-"+noteContextID).removeClass("notelist-item-contextmenu-show");
                noteContextID = 0;
            }
            if(notebook_id){
                $('.notelist-item-notebook-title[title="'+notebook_id+'"]').removeClass("notebook-contextmenu-show");
                notebook_id = 0;
            }
            $("#contextmenu-1").hide(150);
            $("#contextmenu-2").hide(150);
        }
    };

    var oBox = document.getElementById("editor"), oLeft = document.getElementById("editor-ace"), oRight = document.getElementById("editor-show"), oMove = document.getElementById("editor-move");
    oMove.onmousedown = function(e){
        var winw=window.innerWidth
            || document.documentElement.clientWidth
            || document.body.clientWidth;
        var disX = (e || event).clientX;
        oMove.left = oMove.offsetLeft;
        document.onmousemove = function(e){
            var iT = oMove.left + ((e || event).clientX - disX);
            var e=e||window.event,tarnameb=e.target||e.srcElement;
            oMove.style.margin = 0;
            iT < 100 && (iT = 100);
            iT > oBox.clientWidth - 100 && (iT = oBox.clientWidth - 100);
            oMove.style.left  = iT + "px";
            oLeft.style.width = iT + "px";
            oRight.style.width = oBox.clientWidth - iT - 5 + "px";
            oRight.style.marginLeft = iT + 5 + "px";
            return false
        };
        document.onmouseup = function(){
            document.onmousemove = null;
            document.onmouseup = null;
            oMove.releaseCapture && oMove.releaseCapture();
            
        };
        oMove.setCapture && oMove.setCapture();
        return false;
    };


    updateEditorShow();

    simplemde.codemirror.on("change", function(e){
        if(!NoteLoding){
            updateEditorShow();
            showNotsaveLable();
            autosaveNote();
        }
    });

    $(".CodeMirror-vscrollbar").attr("id","editor-ace-scrollbar");

    $("#editor-ace-scrollbar").scroll(function(){
        var t = $(this)[0].scrollTop;
        document.getElementById("editor-show").scrollTop=t * (document.getElementById("editor-show").scrollHeight-document.getElementById("editor-show").offsetHeight) / (document.getElementById("editor-ace-scrollbar").scrollHeight-document.getElementById("editor-ace-scrollbar").offsetHeight);
    });

    $(document).keydown(function(e){
        if( e.ctrlKey && e.which == 83 ){
            saveNote();
            return false;
        }
    });


var matrixRegex = /(?:matrix\(|\s*,\s*)([-+]?[0-9]*\.?[0-9]+(?:[e][-+]?[0-9]+)?)/gi;
var getMatches = function (string, regex) {
    regex || (regex = matrixRegex);
    var matches = [
    ];
    var match;
    while (match = regex.exec(string)) {
        matches.push(match[1]);
    }
    return matches;
};
$.cssHooks["rotation"] = {
    get: function (elem) {
        var $elem = $(elem);
        var matrix = getMatches($elem.css("transform"));
        if (matrix.length != 6) {
            return 0;
        }
        return Math.atan2(parseFloat(matrix[1]), parseFloat(matrix[0])) * (180 / Math.PI);
    },
    set: function (elem, val) {
        var $elem = $(elem);
        var deg = parseFloat(val);
        if (!isNaN(deg)) {
            $elem.css({
                transform: "rotate(" + deg + "deg)"
            });
        }
    }
};
$.cssNumber.rotation = true;
$.fx.step.rotation = function (fx) {
    $.cssHooks.rotation.set(fx.elem, fx.now + fx.unit);
};

$('body').on('click','.logout_btn',function(e){
    e.preventDefault();
    $('#header-user-logoutform').trigger('submit');
});