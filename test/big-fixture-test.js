// big-fixture-test
var test = require('tape')
var simplegraph = require('../simplegraph')

/*** TESTS ***/

var count, fixture, last;

test('BIG FIXTURE SETUP creates over 2 million elements', function(t) {

  t.plan(1);
  
  count = 0;
  var name = '' + ++count;
  fixture = new simplegraph(name);
  
  var child;
  var time = (new Date()).getTime();
  
  for (var i = 0; i < 2000; i++) {
  
    name = '' + ++count;
    child = new simplegraph(name);
    
    for (var j = i ; j > 0; --j) {
    
      name = '' + ++count;
      //child.edges[name] = (new simplegraph(name))
      child.attach(new simplegraph(name))

      //child.attach(simplegraph(name))
      //if (child.indexOf(name) === -1) {
        //child.edges.push(new simplegraph(name))
      //}
    }
    
    fixture.attach(child);
    //fixture.edges.push(child)
    //fixture.edges[child.id] = child;
  }
  
  last = child.id;
  
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to build ' + count + ' items')
  
  t.ok(count === 2001001, 'should be over 2 million elements');
});
  
test('big fixture size', function(t) {

  t.plan(1);
  
  var time = (new Date()).getTime();
  
  t.equal(fixture.size(), (count - 1), 'should have [' + (count - 1) + '] edges')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to size ' + count + ' items')
});

test('big fixture find first child', function(t) {

  t.plan(1);

  var id = '' + 2;
  var time = (new Date()).getTime();
  
  t.equal(fixture.descendant(id).id, id, 'should find first child [' + id + ']')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to find ' + id)
});

test('big fixture find random id', function(t) {

  t.plan(1);

  var id = '' + Math.ceil(Math.sqrt(count) * Math.random(Math.sqrt(count)));
  var time = (new Date()).getTime();
  
  t.equal(fixture.descendant(id).id, id, 'should find by random id [' + id + ']')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to find ' + id)
});

test('big fixture find last last created element by name', function(t) {

  t.plan(1);

  var id = last; // re-using this from the setup
  var time = (new Date()).getTime();
  
  t.equal(fixture.descendant(id).id, id, 'should find last element [' + id + ']')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to find ' + id)
});

test('big fixture subgraph', function (t) {

  t.plan(1);
 
  var time = (new Date()).getTime();
  var visitor = fixture.subgraph();
  t.equal(visitor.ids.length, count, 'should find ' + count + ' elements')
  console.log((((new Date()).getTime() - time) / 1000) + ' seconds to count ' + count)
});