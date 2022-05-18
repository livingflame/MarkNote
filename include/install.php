<!DOCTYPE html>
<html>

<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<title>MarkNote › Install</title>
	<style type="text/css">
		body{
			font-family: "Noto Sans CJK SC","Microsoft YaHei UI","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif;
			font-weight: 100;
			background: #eee;
		}
		h1,h2,h3,h4,h5,h6{
			font-weight: 100;
		}

		a,input,button{
			outline: none !important;
			-webkit-appearance: none;
			border-radius: 0;
		}
		button::-moz-focus-inner,input::-moz-focus-inner{
			border-color:transparent !important;
		}
		:focus {
			border: none;
			outline: 0;
		}

		input[type="text"]{
			border: 1px solid #AAA;
			padding: 5px;
			background-color: #fff;
			color: #333;
			transition: border .25s linear;
		}
		input[type="text"]:hover{
			border: 1px solid #44a8eb;
		}
		input[type="text"]:focus{
			border: 1px solid #3498db;
		}

		#page{
			box-shadow: 0px 2px 6px rgba(100, 100, 100, 0.3);
			background: #fff;
			color: #34495e;
			max-width: 800px;
			margin: 50px auto;
			padding: 30px;
		}
		.underline{
			border-bottom: 2px solid #aaa;
		}
		.subtitle{
			margin: 15px 0 10px 0;
		}
		.btn{
			text-decoration: none;
			display: inline-block;
			padding: 10px 18px;
			background: #3498db;
			box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15);
			color: #fff;
			transition: border .25s linear, color .25s linear, background-color .25s linear;
		}
		.btn:hover{
			background: #44a8eb;
		}
		.btn:active{
			box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.15);
			background: #2488cb;
		}

	</style>
</head>

<body><div id="page">
<?php

	if( file_exists('../config.php') ){
		?>
		<h2 class="underline" style="font-weight:100;margin:0;" >MarkNote Installation Wizard</h2>
		<p>The program has already been installed, if you need to adjust the settings, please edit the config.php in the program directory directly or delete the file to reinstall.</p>

		<?php
		exit();
	}


	if( ! isset($_GET['step']) ){
		//Welcome page
		?>

		<h2 class="underline" style="font-weight:100;margin:0;" >MarkNote Installation Wizard</h2>
		<p>Welcome to MarkNote, this wizard will generate config.php in the program directory, you can also manually create it according to config-sample.php.</p>
		<p>MarkNote requires a working MySQL 5.x database and recommends enabling the mod_rewrite Apache module.</p>

		<p>Please click next to continue</p>

		<a class="btn" style="float:right;" href="install.php?step=2">Next ></a>
		<div style="clear:both;"></div>


		<?php



	}else{
		if($_GET['step']=='2'){
			?>

			<h2 class="underline" style="font-weight:100;margin:0;" >MarkNote Installation Wizard</h2>
			<form id="the-form" action="./install.php?step=3" method="post">
				<h3 class="subtitle">Database Information</h3>
				<table style="margin-left:50px;">
					<tr>
						<td style="width:150px;">Database Host</td>
						<td><input type="text" name="sql-host" value="localhost"></td>
					</tr>

					<tr>
						<td>Database User</td>
						<td><input type="text" name="sql-user" value="root"></td>
					</tr>

					<tr>
						<td>password</td>
						<td><input type="text" name="sql-passwd" value=""></td>
					</tr>

					<tr>
						<td>Database name</td>
						<td><input type="text" name="sql-name" value="marknote"></td>
					</tr>
				</table>


				<h3 class="subtitle">Other options</h3>
				<table style="margin-left:50px;">
					<tr>
						<td style="width:150px;">Enable rewrite</td>
						<td><input type="checkbox" name="enable-rewrite" checked="checked"></td>
					</tr>
				</table>

				<a class="btn" style="float:right;cursor:pointer" onclick="document.getElementById('the-form').submit();">Next ></a>
				<div style="clear:both;"></div>
			</form>

			<?php
		}



		if($_GET['step']=='3'){
			if( !file_exists("../.htaccess") && $_POST['enable-rewrite'] ){
				$htaccess_file_content =
"### MarkNote RewriteRule start
<IfModule mod_rewrite.c>
	RewriteEngine On
	RewriteRule ^([a-zA-Z0-9]+)$ index.php?type=user&user=$1
	RewriteRule ^([a-zA-Z0-9]+)/([a-zA-Z0-9]+)$ index.php?type=notebook&user=$1&notebook=$2
	RewriteRule ^([a-zA-Z0-9]+)/([a-zA-Z0-9]+)/([a-zA-Z0-9]+)$ index.php?type=note&user=$1&notebook=$2&notemane=$3
</IfModule>
### MarkNote RewriteRule end
";
				file_put_contents('../.htaccess', $htaccess_file_content);
			}

			$sql_host	=	$_POST['sql-host'];
			$sql_user	=	$_POST['sql-user'];
			$sql_passwd	=	$_POST['sql-passwd'];
			$sql_name	=	$_POST['sql-name'];
			$enable_rewrite	=	$_POST['enable-rewrite'];

			$sql = new mysqli($sql_host, $sql_user, $sql_passwd, $sql_name);
			if( $sql->connect_errno ){
				?>
				<p>Unable to connect to database, please check your settings.</p>
				<p>Error: (<?php echo $sql->connect_errno.') '.$sql->connect_error; ?> </p>
				<a class="btn" style="cursor:pointer" onclick="history.go(-1)">< back</a>
				<?php
				exit();
			}

			if($enable_rewrite=='on'){
				$enable_rewrite=true;
			}else{
				$enable_rewrite=false;
			}

			$sql->query("CREATE TABLE IF NOT EXISTS `note_content` (
			  `ID` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
			  `user` tinytext DEFAULT NULL,
			  `settings` longtext DEFAULT NULL,
			  `note_type` text NOT NULL DEFAULT 'note',
			  `title` text NOT NULL,
			  `content` longtext DEFAULT NULL,
			  `fields` longtext DEFAULT NULL,
			  `parent_id` int(11) NOT NULL DEFAULT 0,
			  `list_index` int(11) NOT NULL DEFAULT 0,
			  `created` int(20) NOT NULL,
			  `lastmodified` int(20) NOT NULL,
			  `lastaccessed` int(20) NOT NULL,
			  PRIMARY KEY (`ID`)
			) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8");

			$sql->query("CREATE TABLE IF NOT EXISTS `note_users` (
			  `UID` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
			  `username` tinytext DEFAULT NULL,
			  `passwd` tinytext DEFAULT NULL,
			  `email` tinytext DEFAULT NULL,
			  `settings` text DEFAULT NULL,
			  `fields` longtext DEFAULT NULL,
			  PRIMARY KEY (`UID`)
			) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;");


			$to_config_file=
'<?php
	$sql_host="'.$sql_host.'";
	$sql_user="'.$sql_user.'";
	$sql_passwd="'.$sql_passwd.'";
	$sql_name="'.$sql_name.'";
	$enable_rewrite='.$enable_rewrite.';
?>';

			$result = file_put_contents('../config.php', $to_config_file);
			if(!$result){
				?>
				<p>Unable to write configuration file, please check your settings.</p>
				<p>Error: (<?php echo $sql->connect_errno.') '.$sql->connect_error; ?> </p>
				<a class="btn" style="cursor:pointer" onclick="history.go(-1)">< 返回</a>
				<?php
				exit();
			}
			?>
				<h2 class="underline" style="font-weight:100;margin:0;" >MarkNote Installation Wizard</h2>
				<p>Installation is complete</p>
				<a class="btn" style="float:right;cursor:pointer" href="../">Finish</a>
				<div style="clear:both;"></div>
			<?php

		}
	}
?>

</div></body>

</html>
