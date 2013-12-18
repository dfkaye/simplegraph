// big-fixture-test
var test = require('tape')
var graph = require('../simplegraph')

/*** TESTS ***/

var count, fixture, last;

test('BIG FIXTURE SETUP creates over a million elements', function(t) {

  t.plan(1);
  
  count = 0;
  //name = '' + ++count;
  fixture = graph('' + ++count);
  
  var child;
  var time = (new Date()).getTime();
  
  for (var i = 0; i < 1500; i++) {
  
    //name = '' + ++count;
    child = graph('' + ++count);
    
    for (var j = i + 1; j >= 0; --j) {
    
      //name = '' + ++count;
      //child.attach(graph(name))
      //if (child.indexOf(name) === -1) {
        child.edges.push(graph('' + ++count))
      //}
    }
    
    //fixture.attach(child);
    fixture.edges.push(child)
  }
  
  last = child.id;
  
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to build ' + count + ' items')
  
  t.ok(count > 1000000, 'should be over a million elements');
});
  
test('big fixture size', function(t) {

  t.plan(1);
  
  var time = (new Date()).getTime();
  
  t.equal(fixture.size(), count, 'should have ' + count + ' items')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to size ' + count + ' items')
});

test('big fixture find first child', function(t) {

  t.plan(1);

  var id = '' + 2;
  var time = (new Date()).getTime();
  
  t.equal(fixture.find(id).id, id, 'should find first child [' + id + ']')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to find ' + id)
});

test('big fixture find random id', function(t) {

  t.plan(1);

  var id = '' + Math.ceil(Math.sqrt(count) * Math.random(Math.sqrt(count)));
  var time = (new Date()).getTime();
  
  t.equal(fixture.find(id).id, id, 'should find by random id [' + id + ']')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to find ' + id)
});

test('big fixture find last last created element by name', function(t) {

  t.plan(1);

  var id = last; // re-using this from the setup
  var time = (new Date()).getTime();
  
  t.equal(fixture.find(id).id, id, 'should find last element [' + id + ']')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to find ' + id)
});