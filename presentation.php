<?php
require_once dirname(__FILE__).'/include/user.php';
require_once dirname(__FILE__).'/include/note.php';
if(!hasLogin()){
    echo 'Please login';
    exit();
}
?>
<!DOCTYPE html>
<html>
  <head>
    <title>Title</title>
    <meta charset="utf-8">
    <style>
      @import url(https://fonts.googleapis.com/css?family=Yanone+Kaffeesatz);
      @import url(https://fonts.googleapis.com/css?family=Droid+Serif:400,700,400italic);
      @import url(https://fonts.googleapis.com/css?family=Ubuntu+Mono:400,700,400italic);

      body { font-family: 'Droid Serif'; }
      h1, h2, h3 {
        font-family: 'Yanone Kaffeesatz';
        font-weight: normal;
      }
      h1{
        font-size: 44px;
      }
      h2{
        font-size: 40px;
        }
      h3,
      h4,
      h5{
        font-size: 36px;
        }
      .remark-code, .remark-inline-code { font-family: 'Ubuntu Mono'; }
      .remark-slide-content{
          font-size: 28px;
      }
      blockquote::before {
   content: open-quote;
   margin-right: 5px;
   font-size: 1.2em;
}

blockquote {
  border-left: 0.3em solid #ccc;
  padding: 0 15px;
  font-style: italic;
  quotes: "\201C""\201D""\2018""\2019";
}

blockquote::after {
  content: close-quote;
  margin-left: 5px;
  font-size: 1.2em;
}
    </style>
  </head>
  <body>
    <textarea id="source"><?php if(hasLogin() && isset($_GET['note'])){
        echo getNote($_GET['note']);
    } ?></textarea>
    <script src="assets/remark.js">
    </script>
    <script>
      var slideshow = remark.create({
  // Set the slideshow display ratio
  // Default: '4:3'
  // Alternatives: '16:9', ...
  ratio: '16:9',

  // Navigation options
  navigation: {
    // Enable or disable navigating using scroll
    // Default: true
    // Alternatives: false
    scroll: true,

    // Enable or disable navigation using touch
    // Default: true
    // Alternatives: false
    touch: true,

    // Enable or disable navigation using click
    // Default: false
    // Alternatives: true
    click: false,
  },

  // Timer options
  timer: {
    // Start timer when first change occurs
    // Default: true
    // Alternatives: false
    startOnChange: true,

    // Is it possible to reset the timer
    // Default: true
    // Alternatives: false
    resetable: true,

    // Is the timer enabled
    // Default: true
    // Alternatives: false
    enabled: true,

    // A formatter for the elapsed time in milliseconds, defaults to H:mm:ss
    formatter: function (elapsedTime) {
      var left = elapsedTime;
      var millis = left % 1000; left = Math.floor(left / 1000);
      var seconds = left % 60; left = Math.floor(left / 60);
      var minutes = left % 60; left = Math.floor(left / 60);
      var hours = left;

      return '' + hours + ':' + ([minutes, seconds]
        .map(function (d) { return '' + d; })
        .map(function (s) { return s.length < 2 ? '0' + s : s; })
        .join(':'));
    }
  },

  slideNumberFormat: function (current, total) {
    return current + '/' + total;
  },

  // Enable or disable counting of incremental slides in the slide counting
  countIncrementalSlides: true,
  
  // Value indicates if presenter notes should be visible or not.
  // Default: true
  // Alternatives: false
  includePresenterNotes: true,
});

    // highlight any code in the current slide
    slideshow.on('showSlide', function (slide) {
        console.log(slide);
    });

    </script>
  </body>
</html>