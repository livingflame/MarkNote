<?php

	require_once dirname(__FILE__).'/sql.php';
	require_once dirname(__FILE__).'/user.php';


	if( hasLogin() ){


		if( isset($_POST['action']) ){
			if( $_POST['action'] == 'newNote' ){
				if( isset($_POST['title']) ){
					echo newNote($USERNAME, $_POST['title']);
				}
			}
			if( $_POST['action'] == 'newNotebook' ){
				if( isset($_POST['notebook']) ){
					echo newNotebook($USERNAME, $_POST['notebook']);
				}
			}
			if( $_POST['action'] == 'newSubnote' ){
				if( isset($_POST['notebook']) && isset($_POST['title']) ){
					echo newSubnote($USERNAME, $_POST['notebook'], $_POST['title']);
				}
			}

			if( $_POST['action'] == 'newNoteBelow' ){
				if( isset($_POST['id']) && $_POST['title'] && checkNoteUser($_POST['id'], $USERNAME) ){
					echo newNoteBelow($USERNAME, $_POST['id'], $_POST['title']);
				}
			}

			if( $_POST['action'] == 'getNote' ){
				if( isset($_POST['id']) && checkNoteUser($_POST['id'], $USERNAME) ){
					$note = getNote($_POST['id']);
					$content = $note['content'];
					$content = str_replace("&amp;", "&",$content);
					$content = str_replace("&#39;", "'",$content);
					$content = str_replace("&#42;", "\"",$content);
					$content = str_replace("&#61;", "=",$content);
					$content = str_replace("&#63;", "?",$content);
					$content = str_replace("&#92;", "\\",$content);
					$note['content'] =  $content;
					echo json_encode($note);
				}
			}

			if( $_POST['action'] == 'getNoteSettings' ){
				if( isset($_POST['id']) && checkNoteUser($_POST['id'], $USERNAME) ){
					echo json_encode(getNoteSettings($_POST['id']));
				}
			}

			if( $_POST['action'] == 'saveNote' ){
				if( isset($_POST['id']) && isset($_POST['content']) && checkNoteUser($_POST['id'], $USERNAME) ){
					echo saveNote($_POST['id'], $_POST['content']);
				}
			}

			if( $_POST['action'] == 'renameNote' ){
				if( isset($_POST['id']) && isset($_POST['newname']) && checkNoteUser($_POST['id'], $USERNAME) ){
					echo renameNote($_POST['id'], $_POST['newname']);
				}
			}
			if( $_POST['action'] == 'updateNoteSettings' ){
				if( isset($_POST['id']) && isset($_POST['settings']) ){
					echo updateNoteSettings($_POST['id'], $_POST['settings']);
				}
			}
			if( $_POST['action'] == 'cloneNote' ){
				if( isset($_POST['id']) && checkNoteUser($_POST['id'], $USERNAME) ){
					echo cloneNote($_POST['id']);
				}
			}

			if( $_POST['action'] == 'delNote' ){
				if( isset($_POST['id']) && checkNoteUser($_POST['id'], $USERNAME) ){
					echo delNote($_POST['id']);
				}
			}

			if( $_POST['action'] == 'delNotebook' ){
				if( isset($_POST['notebook']) ){
					echo delNotebook($_POST['notebook']);
				}
			}

			if( $_POST['action'] == 'updateNoteList' ){
				if( isset($_POST['list']) ){
					$parent_id = isset($_POST['parent_id']) ? $_POST['parent_id'] : 0;
					$list = (array) json_decode($_POST['list']);
					echo updateNoteList($list,$parent_id);
				}
			}
		}


	}

	function updateNoteList($list,$parent_id){
		global $USERNAME;
		if(!checkID($parent_id)) return -1;
		if(!checkUsername($USERNAME)) return -1;

		echo updatetUserNotebooks($USERNAME, $list, $parent_id);
	}

	function hasNote($id){
		global $sql;
		if(!checkID($id)) return -1;

		$sql_output = $sql->query("SELECT ID FROM note_content
			WHERE ID = '$id'");
		if( $sql_output->num_rows > 0 ){
			return true;
		}else{
			return false;
		}
	}

	function newNote($username, $title='New Note'){
		global $sql;
		if(!checkUsername($username)) return -1;
		if(!checkTitle($title)) return -1;
		$time = time();

		$sql->query("INSERT INTO note_content (user, title, note_type, created)
			VALUES ('$username', '$title', 'note', '$time' )");
		$id = $sql->insert_id;
		return $id;
	}

	function newNotebook($username, $notebook){
		if(!checkUsername($username)) return -1;
		if(!checkTitle($notebook)) return -1;

		addNotebookToUser($username, $notebook);
	}


	function newSubnote($username, $notebook, $title='New Note'){
		global $sql;
		if(!checkUsername($username)) return -1;
		if(!checkID($notebook)) return -1;
		if(!checkTitle($title)) return -1;

		$notebookres = getNotebookByID($notebook,$username);
		
		if($notebookres){
			$sql_output = $sql->query("SELECT COUNT(*) as child_count FROM note_content WHERE parent_id = '$notebook'");
			$index = $sql_output->fetch_array()['child_count'];
			$time = time();
			$content =  replaceTemplateContent($notebookres);
			$sql->query("INSERT INTO note_content (user, title, content, note_type, parent_id, created, list_index)
			VALUES ('$username', '$title', '$content', 'note', '$notebook', '$time', '$index' )");
			var_dump($notebookres);
		}else{
			echo 'notebook does not exists';
			return -1;
		}
		return 'ok';
	}
	function isJson($string) {
		json_decode($string);
		return json_last_error() === JSON_ERROR_NONE;
	}

	function updateNoteSettings($id,$new_settings){
		global $sql, $USERNAME;
		if(!checkUsername($USERNAME)) return -1;
		if(!checkID($id)) return -1;
		if(!checkNoteUser($id, $USERNAME)) return -1;
	

		$note = getNote($id,false);
		$new_settings = (array) json_decode($new_settings,true);
		$array = [];

		if(!empty($note['settings'])){
			$settings = (array) json_decode($note['settings'],true);
			if(json_last_error() === JSON_ERROR_NONE){
				$array = array_merge($settings, $new_settings);
			}
		}

		$settings_json = json_encode($array);
		$sql->query("UPDATE note_content SET settings = '$settings_json'
		WHERE ID = '$id'");
		return json_encode($new_settings);
	}
	function replaceTemplateContent($notebook_detail){
		$content = $notebook_detail['content'];
		$array = [
			'title' => $notebook_detail['title'],
			'long_date_time' => date("F j, Y, g:i a"),
			'long_date' => date("F j, Y"),
			'date' => date("F j, Y"),
			'short_date' => date("M j, Y"),
			'time' => date("g:i a")
		];
		if(!empty($notebook_detail['settings'])){
			$settings = (array) json_decode($notebook_detail['settings'],true);
			if(json_last_error() === JSON_ERROR_NONE){
				$array = array_merge($array,$settings);
			}
		}

		foreach ($array as $code => $value) {
			$content = str_replace ('{{' . $code . '}}', $value, $content);
		}
		return $content;
	}
	function newNoteBelow($username, $id, $title='New Note'){
		global $sql, $USERNAME;
		if(!checkID($id)) return -1;
		if(!checkUsername($USERNAME)) return -1;

		if( hasNote($id) ){
			$sql->query("INSERT INTO note_content (user, title)
				VALUES ('$USERNAME', '$title' )");
			$newNoteID = $sql->insert_id;
			addNoteToUserBelow($USERNAME, $id, $newNoteID);
			return 'ok';
		}
	}

	function getNoteTitle($id){
		global $sql;
		if(!checkID($id)) return -1;

		$sql_output = $sql->query("SELECT title FROM note_content
			WHERE ID = '$id'");
		if( $sql_output->num_rows > 0 ){
			return $sql_output->fetch_array()['title'];
		}else{
			return false;
		}
	}

	function getNoteUser($id){
		global $sql;
		if(!checkID($id)) return -1;

		$sql_output = $sql->query("SELECT user FROM note_content
			WHERE ID = '$id'");
		if( $sql_output->num_rows > 0 ){
			return $sql_output->fetch_array()['user'];
		}else{
			return false;
		}
	}

	function getNoteSettings($id){
		global $sql;
		if(!checkID($id)) return -1;
		$sql_output = $sql->query("SELECT title, settings, note_type, lastaccessed as lastaccess, lastmodified as lastmodify FROM note_content
			WHERE ID = '$id'");
		if( $sql_output->num_rows > 0 ){
			return $sql_output->fetch_array();
		}else{
			return false;
		}
	}

	function checkNoteUser($id, $username){
		if(!checkID($id)) return -1;
		if(!checkUsername($username)) return -1;

		return getNoteUser($id) == $username;
	}

	function updateNoteModifyDate($id){
		global $sql;
		if(!checkID($id)) return -1;
		if( hasNote($id) ){
			$time = time();
			$sql->query("UPDATE note_content SET lastmodified = '$time'
				WHERE ID = '$id'");
			return 'ok';
		}
	}

	function saveNote($id, $content){
		global $sql;
		if(!checkID($id)) return -1;

		if( hasNote($id) ){
            $content = str_replace("&", "&amp;", $content);
			$content = str_replace("'", "&#39;", $content);
			$content = str_replace("\"", "&#42;", $content);
			$content = str_replace("=", "&#61;", $content);
			$content = str_replace("?", "&#63;", $content);
			$content = str_replace("\\", "&#92;", $content);
			$time = time();

			$sql->query("UPDATE note_content SET content = '$content', lastmodified = '$time'
				WHERE ID = '$id'");
			return 'ok';
		}
	}

	function renameNote($id, $newname){
		global $sql;
		if(!checkID($id)) return -1;
		if(!checkTitle($newname)) return -1;

		if( hasNote($id) ){
			$time = time();
			$sql->query("UPDATE note_content SET title = '$newname', lastmodified = '$time'
				WHERE ID = '$id'");
			return 'ok';
		}
	}

	function cloneNote($id){
		global $sql, $USERNAME;
		if(!checkID($id)) return -1;
		if(!checkUsername($USERNAME)) return -1;
		$note = getNote($id,false);

		if( $note ){
			// $newNoteID = newNote($USERNAME, getNoteTitle($id).' - COPY');
			$time = time();
			$newTitle = $note['title'].' - COPY';
			$content = $note['content'];
			$sql->query("INSERT INTO note_content (user, title, content, created)
				VALUES ('$USERNAME', '$newTitle','$content','$time')");
			$newNoteID = $sql->insert_id;

			addNoteToUserBelow($USERNAME, $id, $newNoteID);
			return 'ok';
		}
	}

	function delNote($id){
		global $sql, $USERNAME;
		if(!checkID($id)) return -1;
		if(!checkUsername($USERNAME)) return -1;

		if( hasNote($id) ){
			$sql->query("DELETE FROM note_content
				WHERE ID = '$id'");
		}
	}

	function delNotebook($notebook){
		global $sql, $USERNAME;
		if(!checkID($notebook)) return -1;
		if(!checkUsername($USERNAME)) return -1;
		if( hasNote($notebook) ){
			$sql->query("DELETE FROM note_content
				WHERE ID = '$notebook' OR parent_id = '$notebook'");
		}
	}
