// big-fixture-test
var test = require('tape')
var graph = require('../simplegraph')

/*** TESTS ***/

test('BIG FIXTURE: CREATE OVER ONE MILLION NODES AND TRAVERSE...', function (t) {
  
  var count, name, fixture
  
  ;(function setup() {
        
      count = 0
      name = '' + ++count
      fixture = graph(name)
      
      var child
      var time = +new Date()
      
      for (var i = 0; i < 1500; i++) {
      
        name = '' + ++count
        child = graph(name)
        
        for (var j = i + 1; j >= 0; --j) {
        
            name = '' + ++count
            child.add(graph(name))
        }
        
        fixture.add(child)
      }
      
      console.log(((+new Date() - time) / 1000) + ' seconds to build ' + count + ' items')
  }())
  
  t.test('big fixture size', function(t) {
  
      var time = +new Date()
      t.equal(fixture.size(), count, 'should have ' + count + ' items')
      console.log(((+new Date() - time) / 1000) + ' seconds to size ' + count + ' items')
      t.end()
  })
  
  t.test('big fixture find first child', function(t) {
  
      var id = '' + 2
      var time = +new Date()
      t.equal(fixture.find(id).id, id, 'should find first child [' + id + ']')
      console.log(((+new Date() - time) / 1000) + ' seconds to find ' + id)
      t.end()
  })
  
  t.test('bix fixture find random id', function(t) {
  
      var id = '' + Math.ceil(Math.sqrt(count) * Math.random(Math.sqrt(count)))
      var time = +new Date()
      t.equal(fixture.find(id).id, id, 'should find by random id [' + id + ']')
      console.log(((+new Date() - time) / 1000) + ' seconds to find ' + id)
      t.end()
  })

  t.test('big fixture find last last created element by name', function(t) {
  
      var id = name // re-using this from the setup
      var time = +new Date()
      t.equal(fixture.find(id).id, id, 'should find last element [' + id + ']')
      console.log(((+new Date() - time) / 1000) + ' seconds to find ' + id)
      t.end()
  })
    
  t.end()
})