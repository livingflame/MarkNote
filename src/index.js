import './common.css';
import '../node_modules/simplemde/dist/simplemde.min.css';

import './edit.css';

import $ from 'jquery';
import SimpleMDE from 'simplemde';
import Sortable from 'sortablejs';
import EasyJsonForm from './easyjsonform/easyjsonform-module';

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
    
    var mode = 'read'; //edit or set
    var prev_mode;
    var NOTEID=0;
    var NoteAutosaving = false;
    var NoteAutosaveWaiting = false;
    var noteContextID = 0;
    var notebook_id = 0;
    
    var simplemde = new SimpleMDE({ 
        element: document.getElementById("source"),
        forceSync: true,
        autofocus: true,
        hideIcons: ["preview","side-by-side","guide"],
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

    $("#content").height(winh-56);
    $("#toolbar").height(winh-56);
    $("#sidebar").height(winh-56);
    $("#editor").height(winh-56);
    $("#editor-move").height(winh-56);
    $("#editor-show").height(winh-56-40);

    

    var toolbar_width = $('#toolbar').outerWidth();
    var sidebar_width = $('#sidebar').outerWidth();
    var emove_width = $('#editor-move').outerWidth();
    simplemde.codemirror.setSize(null, winh-105);

    $("#editor").width(winw-(toolbar_width + sidebar_width + emove_width));
    
    
    
    document.getElementById("editor-move").style.left  = (toolbar_width + sidebar_width) + "px";
    document.getElementById("editor").style.left  = (toolbar_width + sidebar_width + emove_width) + "px";

    switch(mode) {
        case 'set':
        case 'edit':
            document.getElementById("editor-ace").style.width =  (winw-(toolbar_width + sidebar_width + emove_width))/2 + "px";
            document.getElementById("editor-ace").style.display = "block";
            document.getElementById("editor-form").style.display = "none";
            document.getElementById("editor-show").style.width = (winw-(toolbar_width + sidebar_width + emove_width))/2 + "px";
            document.getElementById("editor-show").style.marginLeft = (winw-(toolbar_width + sidebar_width + emove_width))/2 + "px";
          break;
        case 'form':
            document.getElementById("editor-ace").style.display = "none";
            document.getElementById("editor-form").style.width =  (winw-(toolbar_width + sidebar_width + emove_width))/2 + "px";
            document.getElementById("editor-form").style.display = "block";
            document.getElementById("editor-show").style.width = (winw-(toolbar_width + sidebar_width + emove_width))/2 + "px";
            document.getElementById("editor-show").style.marginLeft = (winw-(toolbar_width + sidebar_width + emove_width))/2 + "px";
          break;
        default:
            document.getElementById("editor-form").style.display = "none";
            document.getElementById("editor-ace").style.display = "none";
            document.getElementById("editor-show").style.width = (winw-(toolbar_width + sidebar_width + emove_width)) + "px";
            document.getElementById("editor-show").style.marginLeft = "0";
      }

}

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
              put: ["sublist"],
              pull:true
            },
            ghostClass: 'notelist-item-moving',
            animation: 150,
            draggable: ".notelist-item-single,.notelist-folder",
            onSort: function(evt,test,test2){
                updateList(notelist);
            }
        });

        // other lists: notes in each notebooks
        $("#sidebar-notelist .notelist-folder").each(function(){
            var sub_list = this;
            Sortable.create(this, {
                group: {
                  name: "sublist",
                  put: ["notelist"],
                  pull:true
                },
                ghostClass: 'notelist-item-moving',
                animation: 150,
                draggable: ".notelist-item-subnote",
                onSort: function(evt,test,test2){
                    updateSubList(sub_list);;
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
function updateSubList(list){
    var newList = [];

    $(list).children('.notelist-item-single').removeClass('notelist-item-single').addClass('notelist-item-subnote');

    $(list).children('.notelist-item-subnote').each(function(){
        var noteid = $(this).attr("data-note-id");
        if(noteid){
            newList.push(noteid);
        }
    });

    var parent_id = $(list).attr('data-note-id');

    var newListJSON = JSON.stringify(newList);
    // alert(newListJSON);

    $.post("include/note.php",{
        action:"updateNoteList",
        list:newListJSON,
        parent_id:parent_id
    },
    function(data,status){
        // alert("Status: " + status + data );
    });
}
function updateList(list){
    
    var newList = [];

    $(list).children('.notelist-item-subnote').removeClass('notelist-item-subnote').addClass('notelist-item-single');

    $(list).children('.notelist-item-single,.notelist-folder').each(function(){
        var noteid = $(this).attr("data-note-id");
        if(noteid){
            newList.push(noteid);
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
function loadNoteActions(id){
    if(NOTEID){
        if(NOTEID == id){
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
}

function loadNote(id){
    mode = 'edit';
    getNote(id,function(){
        updateEditorShow();
    })
}

function getNote(id,callable){
    var call = callable || $.noop;
    updateStatusBar("#f1c40f", "Loading note...");
    loadNoteActions(id);
    NoteLoding=true;
    $.post("include/note.php",{
        action:"getNote",
        id:id
    },
    function(data,status){
        var obj = JSON.parse(data);
        simplemde.value(obj.content);
        $('#source').val(obj.content);
        NoteLoding=false;
        updateStatusBar("#0f2", "Note loaded");
        call.call(obj,status);
    });
}

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
            mode = 'read';
            doLayout();
            updateStatusBar("#0f2", "Note deleted");
        } else {
            updateStatusBar("#0f2", "Note deleted");
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

function updateNoteSettings(id,settings,call){
    $.post("include/note.php",{
        action:"updateNoteSettings",
        id:id,
        settings: JSON.stringify(settings)
    },
    function(data,status){
        var callable = call || $.noop;
        callable.call(this, data,status);
    });
}

function toggleNotebook(item){
    var opened = false;
    var note_id = $(item).attr('data-note-id');
    var settings = {};
    if($(item).hasClass("notebook-opened")){
        $(item).parent().animate({height:"32px"});
        $(item).parent().children("i").animate({rotation: -90});
        opened = false;
    }else{
        $(item).parent().animate({height:$(item).parent().children(".notelist-item").length*32+"px" });
        $(item).parent().children("i").animate({rotation: 0});
        opened = true;
    }
    
    $(item).toggleClass("notebook-opened");
    settings['notebook-opened'] = opened;
    updateNoteSettings(note_id,settings);
}


function showProperties(id, notesettings){
    var winh=window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight;

    var winw=window.innerWidth
        || document.documentElement.clientWidth
        || document.body.clientWidth;

    notesettings = JSON.parse(notesettings);
    $("#sidebar-properties-header-notename").html(notesettings['title']);
    $("#sidebar-properties-header-notetype").html(notesettings['note_type']);
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
    document.getElementById("status-icon").style.color = color;
    document.getElementById("status-text").innerHTML = text;
}


function showContextMenu(item, event, context_type){
    var e = event || window.event;
    
    if(noteContextID){
        $("#notelist-item-"+noteContextID).removeClass("notelist-item-contextmenu-show");
        noteContextID = 0;
    }
    if(notebook_id){
        $('.notelist-item-notebook-title[data-note-id="'+notebook_id+'"]').removeClass("notebook-contextmenu-show");
        notebook_id = 0;
    }

    var note_context = $("#contextmenu-1");
    note_context.hide();

    var notebook_context = $("#contextmenu-2");
    notebook_context.hide();

    if(context_type == 'notebook'){
        $("#contextmenu-2").css({
            "top" : e.clientY+'px',
            "left" : e.clientX+'px',
            'display': 'block'
        });
        var content_height = $('#content').height();
        var menu_height = $("#contextmenu-2").height();
        if((e.clientY + menu_height) > content_height ){
            $("#contextmenu-2").css({
                "top": (e.clientY - menu_height) + 'px'
            });
        }

        notebook_id = $(item).attr("data-note-id");
        $(item).addClass("notebook-contextmenu-show");
    } else {
        $("#contextmenu-1").css({
            "top" : e.clientY+'px',
            "left" : e.clientX+'px',
            'display': 'block'
        });
        var content_height = $('#content').height();
        var menu_height = $("#contextmenu-1").height();
        if((e.clientY + menu_height) > content_height ){
            $("#contextmenu-1").css({
                "top": (e.clientY - menu_height) + 'px'
            });
        }
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
        case "edit":
            mode = 'edit';
            loadNote(noteContextID, item);
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

function settingsForm(structure){
    var ejf;
    var ejfoptions = {
        disabled: false,
        fileHandler: {
            // Returns a string with the name to be displayed
            displayName: (value) => EasyJsonForm.dictionary['item.file.vaule.uploaded.file'],
            // Returns a Promise (fetch can be used!) which will resolve as an object with keys 
            // 'success' (boolean) and 'value' (string: value to be stored or error message)
            upload: (file) => {
                return new Promise((resolve, reject) => {
                    console.log(file);
                    setTimeout(()=>resolve({success: true, value: 'sampleFileName'}), 3000);
                });
            },
            // Returns the url for the link to be displayed
            url: (value) => 'https://google.com',
        },
        formContainer: 'form',
        formAction: null,
        formMethod: null,
        onStructureChange: () => {
            //
        },
        // 'onValueChange' can receive a callback function which is invoked whenever the user
        // changes the values in a form
        onValueChange: () => {
            document.getElementById('editor-show').appendChild(ejf.formGet());
        },
    };

    ejf = new EasyJsonForm('settings-form',structure,null,ejfoptions);
    document.getElementById('editor-show').appendChild(ejf.formGet());
}

function loadNotebook(id){
    NOTEID = id;
    getNote(id,function(){
        mode = 'set';
        updateEditorShow();
        settingsForm(JSON.parse(this.fields));
        doLayout();
        simplemde.codemirror.refresh();
    })
}

function settingsFormBuilder(structure){
    var ejf;
    var ejfoptions = {
        disabled: false,
        fileHandler: {
            // Returns a string with the name to be displayed
            displayName: (value) => EasyJsonForm.dictionary['item.file.vaule.uploaded.file'],
            // Returns a Promise (fetch can be used!) which will resolve as an object with keys 
            // 'success' (boolean) and 'value' (string: value to be stored or error message)
            upload: (file) => {
                return new Promise((resolve, reject) => {
                    console.log(file);
                    setTimeout(()=>resolve({success: true, value: 'sampleFileName'}), 3000);
                });
            },
            // Returns the url for the link to be displayed
            url: (value) => 'https://google.com',
        },
        formContainer: 'form',
        formAction: null,
        formMethod: null,
        onStructureChange: () => {
            ejf.formUpdate();
            document.getElementById('editor-form').appendChild(ejf.builderGet());
            document.getElementById('editor-show').appendChild(ejf.formGet());
        },
        // 'onValueChange' can receive a callback function which is invoked whenever the user
        // changes the values in a form
        onValueChange: () => {
            //test
        },
    };

    ejf = new EasyJsonForm('settings-form',structure,null,ejfoptions);
    document.getElementById('editor-form').appendChild(ejf.builderGet());
    document.getElementById('editor-show').appendChild(ejf.formGet());
}

function loadNotebookFormbuilder(id){
    NOTEID = id;
    getNote(id,function(){
        mode = 'form';
        updateEditorShow();
        settingsFormBuilder(JSON.parse(this.fields));
        doLayout();
    })
}

function noteBookContextClick(operation, item){
    switch(operation){
        case "edit_template":
            loadNotebook(notebook_id);
            break;
        case "rename_notebook":
            renameNote(notebook_id,item);
            break;
        case "notebook_form_builder":
            loadNotebookFormbuilder(notebook_id,item);
            break;
        case "delete_notebook":
            if(confirm("Delete this notebook? All subnotes will also be deleted. Are you sure?")){
                delNotebook(notebook_id, item);
            }
            break;
        case "notebook_properties":
            getNoteSettings(notebook_id, item);
            break;
    }
    $("#contextmenu-2").hide(150);
    if(notebook_id){
        $('.notelist-item-notebook-title[data-note-id="'+notebook_id+'"]').removeClass("notebook-contextmenu-show");
        notebook_id = 0;
    }
}



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

window.onresize = function () {
    doLayout();
}

$('body').on('click','[title="Edit Mode"]',function(e){
    e.preventDefault();
    mode = (mode === 'edit') ? 'read' : 'edit';
    if(mode === 'edit'){
        loadNote(NOTEID);
    }
    doLayout();

    simplemde.codemirror.refresh();
});

$('body').on('click','.notelist-newNote',newNote);

$('[title="New Note"]').on('click',newNoteBelow);

$('body').on('click','.notelist-item-subnote2',function(e){
    e.preventDefault();
    var notebook = $(this).attr('data-note');
    newSubnote(notebook)
});

$('body').on('click','.notelist-load-note',function(e){
    if(mode !== 'red'){
        mode = 'edit';
    }
    $('.notelist-item').removeClass('notelist-item-contextmenu-show');
    $('.notelist-item').removeClass('notelist-item-selected2');
    
    e.preventDefault();
    var id = $(this).attr('data-note-id');
    loadNote(id);
});

$('[title="Save"]').on('click',saveNote);
$('body').on('click','.notebook-toggleNotebook',function(e){
    e.preventDefault();
    toggleNotebook(this);
});
$('body').on('click','#page-glass',hideProperties);

$('body').on('click','.contextmenu-item',function(e){
    e.preventDefault();
    var operation = $(this).attr('data-operation');
    noteContextClick(operation,this);
});
$('body').on('click','.notebook-contextmenu-item',function(e){
    e.preventDefault();
    var operation = $(this).attr('data-operation');
    noteBookContextClick(operation,this);
});
$('body').on('click','[title="New Notebook"]',newNotebook);


$("#btn-newnote").on('click',function(){
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

$("#btn-subnote").on('click',function(){
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

var NoteLoding=false;

loadNotelist();
doLayout();
updateStatusBar("#bdc3c7", "Ready");


var oBox = document.getElementById("content"), 
oLeft = document.getElementById("sidebar"), 
oRight = document.getElementById("editor"), 
oMove = document.getElementById("editor-move");

oMove.onmousedown = function(e){
    var winw = window.innerWidth
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
        oLeft.style.width = (iT - 48) + "px";
        oRight.style.width = oBox.clientWidth - iT - 5 + "px";
        oRight.style.left = iT + 5 + "px";

        doLayout();
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

$("#editor-ace-scrollbar").on('scroll',function(){
    var t = $(this)[0].scrollTop;
    document.getElementById("editor-show").scrollTop=t * (document.getElementById("editor-show").scrollHeight-document.getElementById("editor-show").offsetHeight) / (document.getElementById("editor-ace-scrollbar").scrollHeight-document.getElementById("editor-ace-scrollbar").offsetHeight);
});
var timerId;

$(document).on('keydown',function(e){
    clearTimeout(timerId);
    if( e.ctrlKey && e.which == 83 ){
        timerId =  setTimeout(() => { saveNote(); }, 5000);
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