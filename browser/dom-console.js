!(function(global) {

  var out = document.createElement('div');
  out.innerHTML = '<h1>' + document.title + '</h1>';
  out.innerHTML += '<h2>results</h2>';

  var results = document.createElement('ul');
  out.appendChild(results);

  var body = document.getElementsByTagName('body')[0];
  body.insertBefore(out, body.firstChild);

  var slice = [].slice;
    
  function write(arg) {
  
    var li = document.createElement('li');
    
    li.innerHTML = '<code>' + slice.call(arg, 0).join('').replace(/[\n]/g, '<br/>').replace(/\s/g, '&nbsp;') + '</code>';
    results.appendChild(li);
  }

  !(function(){
  
      var console;
      var names;
      
      if (!global.console) {
      
        console = {};
        names = ['error', 'info', 'log', 'warn', 'dir'];
        
        for (var i = 0; i < names.length; ++i) {
          console[names[i]] = function() {
            write(arguments); 
          };
        }
        
        global.console = console;
        
      } else {
      
          console = global.console;
          
          for (var k in console) {
            if (typeof console[k] == 'function') {
            
              !(function() {
   
                var method = console[k];

                console[k] = function() {
                  write(arguments); 
                  method.apply(console, arguments);
                };
              }());
            }
          }
      }
  }());

}(window));