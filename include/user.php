<?php
	/* 用户相关函数 */

	require_once 'sql.php';

	$USERNAME = '';

	$FORCESTATUS = 0;


	function hasUser($username){
		global $sql;
		if(!checkUsername($username)) return -1;

		$sql_output = $sql->query("SELECT username FROM note_users
			WHERE username = '$username'");
		if( $sql_output->num_rows > 0 ){
			return true;
		}
		return false;
	}

	function hasLogin(){
		global $sql, $USERNAME, $FORCESTATUS;

		if($FORCESTATUS == 1) return true;
		if($FORCESTATUS == 2) return false;

		if(!isset($_COOKIE['MarkNoteUser']) || !isset($_COOKIE['MarkNotePasswd']))
			return false;

		$username = $_COOKIE['MarkNoteUser'];
		if(!checkUsername($username)) return -1;

		$sql_output = $sql->query("SELECT passwd FROM note_users
			WHERE username = '$username'");
		if( $sql_output->num_rows > 0 ){
			$truePasswd = $sql_output->fetch_array(MYSQLI_ASSOC)['passwd'];
		}else{
			return false;
		}

		if( $truePasswd == $_COOKIE['MarkNotePasswd'] ){
			$sql_output = $sql->query("SELECT username FROM note_users
				WHERE username = '$username'");
			$username = $sql_output->fetch_array(MYSQLI_ASSOC)['username'];
			$USERNAME = $username;
			return true;
		}else{
			return false;
		}

	}

	function register($username, $email, $passwd, $nickname){
		global $sql;
		if(!checkUsername($username)) return -1;
		if(!checkEmail($email)) return -1;
		if(!checkTitle($nickname)) return -1;

		if( hasUser($username) )
			exit('Username already exist');
		$passwd = md5('ffffffffff'.$passwd.'蛤蛤蛤');
		$sql->query("INSERT INTO note_users (username, passwd, email, settings)
			VALUES ('$username', '$passwd', '$email', '{\"nickname\":\"$nickname\" }')");
	}

	function login($username, $passwd){
		global $sql, $USERNAME, $FORCESTATUS;
		if(!checkUsername($username)) return -1;

		$sql_output = $sql->query("SELECT passwd FROM note_users
			WHERE username = '$username'");
		if( $sql_output->num_rows > 0 ){
			$truePasswd = $sql_output->fetch_array(MYSQLI_ASSOC)['passwd'];
		}else{
			echo "no this user";
			return -1;
		}
		if(md5('ffffffffff'.$passwd.'蛤蛤蛤') == $truePasswd){
			$sql_output = $sql->query("SELECT username FROM note_users
				WHERE username = '$username'");
			$username = $sql_output->fetch_array(MYSQLI_ASSOC)['username'];
			setcookie('MarkNoteUser', $username, time()+604800);
			setcookie('MarkNotePasswd', md5('ffffffffff'.$passwd.'蛤蛤蛤'), time()+604800);
			$USERNAME = $username;
			$FORCESTATUS = 1;
			return 0;
		}else{
			echo "wrong passwd";
			return -1;
		}
	}

	function getUserEmail($username){
		global $sql;
		if(!checkUsername($username)) return -1;

		$sql_output = $sql->query("SELECT email FROM note_users
			WHERE username = '$username'");
		return $sql_output->fetch_array(MYSQLI_ASSOC)['email'];
	}

	function logout(){
		global $FORCESTATUS;
		setcookie('MarkNoteUser', '', time()-100);
		setcookie('MarkNotePasswd', '', time()-100);
		$FORCESTATUS = 2;
	}
	function getNotebookByID($id,$user){
		global $sql;
		$sql_output = $sql->query("SELECT * FROM note_content WHERE user = '$user' AND ID = '$id' AND note_type = 'notebook'");

		return ($sql_output) ? $sql_output->fetch_array(MYSQLI_ASSOC) : $sql_output;
	}
	function addNotebookToUser($username, $notebook){
		global $sql;
		if(!checkUsername($username)) return -1;
		if(!checkTitle($notebook)) return -1;

		$sql_output = $sql->query("SELECT title FROM note_content
			WHERE user = '$username' AND title = '$notebook' AND note_type = 'notebook'");
		if($sql_output->fetch_array(MYSQLI_ASSOC)){
			echo 'notebook name already exist';
			return -1;
		}else{
			$time = time();
			$sql->query("INSERT INTO note_content (user, title, note_type, created)
			VALUES ('$username', '$notebook', 'notebook', '$time' )");
		}
		echo 'ok';
	}

	function addNoteToNotebook($username, $notebook, $id){
		global $sql;
		if(!checkUsername($username)) return -1;
		if(!checkTitle($notebook)) return -1;
		if(!checkID($id)) return -1;

		$notebook_details = getNotebookByID($id,$username);
		if($notebook_details){
			$sql_output = $sql->query("SELECT COUNT(*) as child_count FROM note_content WHERE parent_id = '$notebook' ");
			$index = $sql_output->fetch_array(MYSQLI_ASSOC)['child_count'];
			$sql->query("UPDATE note_content SET parent_id = '$notebook', list_index = $index
				WHERE user = '$username'AND ID = '$id'");
		}

	}
	function buildTree(array $elements, $parentId = 0) {
		$branch = array();
	
		foreach ($elements as $element) {
			if ($element['parent_id'] == $parentId) {
				$children = buildTree($elements, $element['ID']);
				if ($children) {
					$element['children'] = $children;
				}
				$branch[] = $element;
			}
		}
	
		return $branch;
	}
	function getUserNotes($username){
		global $sql;
		if(!checkUsername($username)) return -1;
		$rows = [];
		$sql_output = $sql->query("SELECT * FROM note_content
			WHERE user = '$username' ORDER BY list_index ASC");

		if($sql_output){
			while($row = $sql_output->fetch_array(MYSQLI_ASSOC))
			{
				$rows[] = $row;
			}
		}

		return buildTree($rows);
	}

	function getIDListFromNoteList($list){
		$IDList = array();
		foreach ($list as $value) {
			if(is_int($value)){
				$IDList[] = $value;
			}
			if(is_array($value)){
				foreach ($value as $value2) {
					if(is_int($value2)){
						$IDList[] = $value2;
					}
				}
			}
		}
		sort($IDList);
		return $IDList;
	}

	function updatetUserNotebooks($username, $list, $parent_id = 0){
		global $sql;
		if(!checkUsername($username)) return -1;
		foreach($list as $key => $id ){
			var_dump($sql->query("UPDATE note_content SET list_index = '$key', parent_id = '$parent_id' WHERE ID = '$id'"));
		}
		echo json_encode($list);
	}
	function updateNoteAccessDate($id){
		global $sql;
		if(!checkID($id)) return -1;
		if( hasNote($id) ){
				$time = time();
			$sql->query("UPDATE note_content SET lastaccessed = '$time'
				WHERE ID = '$id'");
			return 'ok';
		}
	}
	function getNote($id,$update_access = true){
		global $sql;
		if(!checkID($id)) return -1;

		$sql_output = $sql->query("SELECT * FROM note_content
			WHERE ID = '$id'");
		if( $sql_output->num_rows > 0 ){
			$content = $sql_output->fetch_array(MYSQLI_ASSOC);
			if($update_access){
				updateNoteAccessDate($id);
			}
			return $content;

		}else{
			return false;
		}
	}
	function addNoteToUserBelow($username, $id, $newid){
		global $sql;
		if(!checkUsername($username)) return -1;
		if(!checkID($id)) return -1;
		if(!checkID($newid)) return -1;

		$above_note = getNote($id,false);

		if($above_note){
			$parent = $above_note['parent_id'];
			$index = $above_note['list_index'] + 1;
			$time = time();
			$sql->query("UPDATE note_content SET lastmodified = '$time', parent_id = '$parent', list_index= '$index'
				WHERE ID = '$newid'");
		}
		
	}