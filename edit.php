<?php
	require_once dirname(__FILE__).'/include/user.php';
	require_once dirname(__FILE__).'/include/note.php';

	if(!hasLogin()){
		echo 'Please login';
		exit();
	}

	if( hasLogin() && isset($_POST['action']) && $_POST['action'] == 'getNotelist' ){
		$theNotebooks = getUserNotebooks($USERNAME);
		if(empty($theNotebooks)){
			$theNotebooks = array();
		}
		foreach ($theNotebooks as $value) {
			if(is_int($value)){
				?>
				<div id="notelist-item-<?php echo $value?>" class="notelist-item notelist-load-note notelist-item-single" title="<?php echo getNoteTitle($value); ?>" data-id="" data-note-id="<?php echo $value?>"><i class="fa fa-file-text" aria-hidden="true"></i><?php echo getNoteTitle($value); ?></div>
				<?php
			}
			if(is_array($value)){
				?>
				<div class="notelist-item-single" style="height: 1px;"></div>
				<div class="notelist-folder">
					<i class="fa fa-angle-down fa-lg i-notelist-folder-arrow" aria-hidden="true"></i>
					<div class="notelist-item notebook-opened notebook-toggleNotebook notelist-item-notebook-title" title="<?php echo $value[0]; ?>">
						<i class="fa fa-book" aria-hidden="true"></i>
						<span class="notebook_name"><?php echo $value[0]; ?></span>
					</div>
					<?php
					foreach ($value as $note) {
						if(is_int($note)){
							?>
							<div id="notelist-item-<?php echo $note?>" class="notelist-item notelist-load-note notelist-item-subnote" title="<?php echo getNoteTitle($note); ?>" data-note-id="<?php echo $note?>">
								<i class="fa fa-file-text" aria-hidden="true"></i>
								<span class="note_name"><?php echo getNoteTitle($note); ?></span>
							</div>
							<?php
						}
					}
					?>
					<div class="notelist-item notelist-item-subnote2" data-note="<?php echo $value[0]; ?>">
						<i class="fa fa-plus" aria-hidden="true"></i>
						New Note
					</div>
				</div><?php
			}
		}
		?>
		<div class="notelist-item-single" style="height: 1px;"></div>
		<div class="notelist-item notelist-newNote">
			<i class="fa fa-plus" aria-hidden="true"></i>
			New Note
		</div>
		<div class="notelist-item" title="New Notebook">
			<i class="fa fa-plus" aria-hidden="true"></i>
			New Notebook
		</div>
		<?php
		exit();
	}

?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<title>MarkNote</title>
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<link href="//cdn.bootcss.com/font-awesome/4.6.3/css/font-awesome.css" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.11.1/katex.min.css">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"/>
	<link rel="stylesheet" type="text/css" href="dist/main.css">
</head>
<body>
	<div id="header">
		<h1 id="header-title">MarkNote</h1>
		<div id="header-user">
			<div id="header-user-head">
				<i class="fa fa-user fa-2x" aria-hiddem="true" style="margin: 7px 0px 0px 5px;"></i>
			</div>
			<span id="header-user-name"><?php echo $USERNAME; ?></span>
			<span id="header-user-emailandlogout"><?php echo getUserEmail($USERNAME); ?> | <button class="logout_btn">logout</button></span>
			<form id="header-user-logoutform" method="post" action="login.php">
				<input type="hidden" name="type" value="logout">
			</form>

		</div>
	</div>
	<div id="content">
		<div id="toolbar">
			<div class="toolbar-icon" title="New Note" style="padding-left: 17px;"><span class="fa fa-file-tex" style="font-size: 19px;"></span></span></div>
			<div class="toolbar-icon" title="New Notebook"><span class="fa fa-folder"></span></div>
			<div class="toolbar-icon" title="Save"><i class="fa fa-lg fa-floppy-o" aria-hidden="true"></i></div>
			<div class="toolbar-icon" title="Search" onclick="EditorAce.config.loadModule('ace/ext/searchbox');" style="padding-left: 14px;"><span class="fa fa-search"></span></div>
			<div class="toolbar-icon" title="Settings" onclick=""><span class="fa fa-cog"></span></div>
			<div class="toolbar-icon" title="Edit Mode"><span class="fa fa-pencil-square"></span></div>
		</div>
	 	<div id="sidebar">
	 		<div id="sidebar-status">Status: <span id="sidebar-status-icon">●</span> <span id="sidebar-status-text">page loding...</span></div>
			<div id="sidebar-notelist">load</div>
	 	</div>
	 	<div id="editor">
			<div id="editor-ace">
			<textarea id="source"># Welcome to Marknote
Please select a __note__ in the list on the left.</textarea>
			</div>
			<div id="editor-move"></div>
			<div id="editor-show"></div>
			<div id="editor-show-preprocess"></div>
		</div>
	</div>

	<div id="contextmenu-1" class="contextmenu">
		<div class="contextmenu-item" data-operation="open">		<i class="fa fa-file" aria-hidden="true"></i> Open</div>
		<div class="contextmenu-item" data-operation="rename">	<i class="fa fa-edit" aria-hidden="true"></i> Rename</div>
		<div class="contextmenu-item" data-operation="clone">		<i class="fa fa-clone" aria-hidden="true"></i> Clone</div>
		<!-- <div class="contextmenu-item" data-operation="share">		<i class="fa fa-share-alt" aria-hidden="true"></i> Share</div> -->
		<!-- <div class="contextmenu-item" data-operation="export">	<i class="fa fa-external-link " aria-hidden="true"></i> Export</div> -->
		<div class="contextmenu-item" data-operation="delete">		<i class="fa fa-trash" aria-hidden="true"></i> Delete</div>
		<div class="contextmenu-item" data-operation="properties">	<i class="fa fa-info-circle" aria-hidden="true"></i> Properties</div>
		<div class="contextmenu-item" data-operation="present">	<i class="fa fa-desktop" aria-hidden="true"></i> Presentation</div>
	</div>

	<div id="contextmenu-2" class="contextmenu">
		<div class="notebook-contextmenu-item" data-operation="notebook_properties"><i class="fa fa-info-circle" aria-hidden="true"></i> Properties</div>
		<div class="notebook-contextmenu-item" data-operation="rename_notebook"><i class="fa fa-edit" aria-hidden="true"></i> Rename</div>
		<div class="notebook-contextmenu-item" data-operation="delete_notebook"><i class="fa fa-trash" aria-hidden="true"></i> Delete</div>
	</div>

	<div id="page-glass"></div>
	<div id="sidebar-properties">
		<div id="sidebar-properties-header">
			<i class="fa fa-file-text fa-3x" aria-hidden="true"></i>
			<span id="sidebar-properties-header-notename">notename</span>
			<span id="sidebar-properties-header-notetype">notetype</span>
		</div>
		<div id="sidebar-properties-body">
			<span class="sidebar-properties-body-lable">Note name </span><span id="sidebar-properties-body-name"></span><br>
			<span class="sidebar-properties-body-lable">Last modify </span><span id="sidebar-properties-body-lastmodify"></span><br>
			<span class="sidebar-properties-body-lable">Last access </span><span id="sidebar-properties-body-lastaccess"></span><br>
		</div>
	</div>
	<input id="float-input" type="text">
	<div id="float-notsaved-lable">●</div>
	<script src="dist/main.js"></script>
</body>
</html>
