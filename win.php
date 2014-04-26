<?
if($_GET['name']){
  $fp = fopen('scores.dat','a');
  fwrite($fp, "\n" . $_GET['name'] . "\t" . $_GET['deaths'] . "\t" . date("Y-m-d H:i:s"));
  fclose($fp);
  header('Location: win.php');
 }else{
?>

<h1>High Scores</h1>
<table border=1>
<tr><td><b>Name</b></td><td><b>Deaths</b></td><td><b>Date</b></td></tr>
<?

    $dat = file_get_contents('scores.dat');
  $lines = preg_split('/\n/',$dat);
  
  function cmp($a, $b){
    if($a[1] == $b[1]){
      if($a[2] == $b[2]){
        return 0;
      }
      return $a[2] < $b[2] ? -1 : 1;
    }
    return $a[1] < $b[1] ? -1 : 1;
  }

  $scores = array();

  foreach($lines as $line){
    $scores[] = preg_split('/\t/', $line);
  }

  uasort($scores, 'cmp');
  foreach($scores as $score){
    ?><tr><td><?=htmlentities($score[0])?></td><td><?=htmlentities($score[1])?></td><td><?=htmlentities($score[2])?></td></tr><?
  }
?></table><?
} ?>