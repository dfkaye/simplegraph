
// wrapped so we could try it in firebug/browser
if (typeof module != 'undefined' && module.exports) {
  module.exports = simplegraph;
}

/*
 * @constructor simplegraph (new is optional)
 * param string id - required
 */
function simplegraph(id) {

  if (!(this instanceof simplegraph)) {
    return new simplegraph(id)
  }
  
  if (!id || typeof id != 'string') {
    throw new Error('simplegraph() requires non-empty string id argument.')
  }
  
  this.id = id;
  this.edges = {};
}

/*
 * @method attach inserts an edge in the current graph.
 * @param edge graph instance
 * @returns false if an edge with matching id is found, else returns the attached edge
 */
simplegraph.prototype.attach = function attach(edge) {

  if (!(edge instanceof simplegraph)) {
    throw new Error('attach() attempting to attach a non-graph object as an edge');
  }

  if (!this.edges[edge.id]) { 
    return this.edges[edge.id] = edge;
  }
  return false;
};

/*
 * @method detach removes an edge with the matching id.
 * @returns boolean false is no edge found, else returns the removed edge
 */
simplegraph.prototype.detach = function detach(id) {
  var edge = this.edges[id] || false;
  if (edge) { 
    delete this.edges[id];
  }
  return edge;
};

/*
 * @method empty checks whether graph contains any edges.
 * @returns boolean
 */
simplegraph.prototype.empty = function empty() {
  for (var k in this.edges) {
    return false;
  }
  return true;
};

/*
 * @method has checks whether graph contains edge with id.
 * @param string id
 * @returns boolean
 */
simplegraph.prototype.has = function has(id) {
  return this.edges[id] || false;
};

/*
 * @method size counts all graphs in subgraph, and includes the current graph.
 * @returns the number of results.
 */
simplegraph.prototype.size = function size() {
  // performance note:
  // (0.931s to size 2001001 items using edges map) vs (2.4s using resolve().ids.length)
  // (0.025s to size 2001001 items using edges array) vs (1.36s using resolve().ids.length))

  var size = 0;
  var edges = this.edges;
  
  for (var k in edges) {
    size = size + 1;
    size += edges[k].size();
  }
  
  return size;  
};


// TRAVERSAL METHODS WITH RESOLVE AND VISITOR

/*
* @method resolve - performs a recursive visit through graph and subgraphs. Sets an error 
*   field with an Error instance if a cycle is detected.
* @param object visitor - optional - collector with interface provided by graph#visitor() 
*   method.
* @returns visitor
*/
simplegraph.prototype.resolve = function resolve(visitor) {

  // code smell ~ four guard clauses + an error clause
  // make this more composable so we avoid visitor?

  var id = this.id;
  var edges;
  var length;
  var k;
  
  visitor = visitor || this.visitor();
  
  if (!visitor.visited[id]) {
  
    visitor.ids.push(id);
    
    if (visitor.visiting[id]) {
      throw new Error('Circular reference detected: ' + visitor.ids.join(' -> '));
    }
  }

  // happy path
  visitor.visiting[id] = 1;

  if (typeof visitor.visit == 'function') {
    visitor.visit(this);
  }
  
  // descend if didn't call done() 
  if (!visitor.exit) {
  
    edges = this.edges;
    
    for (k in edges) {
      // THIS IS A PROBLEM -
      // SHOULD CALL VISITOR.VISIT + AFTER    
      edges[k].resolve(visitor);
    } 
  }
  
  // code smell ~ after clause
  // post-processing
  if (typeof visitor.after == 'function') {
    visitor.after(this);
  }
  
  visitor.visited[id] = 1;
  visitor.visiting[id] = 0;
  
  return visitor;
};

/*
 * @method visitor - creates a visitor for use by the resolve() method
 * @returns visitor object
 *
 * TODO - looks like visitor wants to emerge as its own type
 * - not sure if visitor should be an external object with visitor.visit(graph) api,
 * - or should continue with graph.resolve(visitor)...
 */
simplegraph.prototype.visitor = function visitor(fn) {

  var graph = this;

  return {
    id: graph.id,
    ids: [],
    results: [],
    visited: {},
    visiting: {},
    done: function () {
      this.exit = true;
    },        
    visit: fn,
    after: null
  };
};

/*
* @method remove detaches all occurrences of subgraph from the graph and its descendants.
* param string id - required id of the subgraph to be detachd
* returns an array of graphs from which the target has been detachd.
*/
simplegraph.prototype.remove = function remove(id) {

  var visitor = this.visitor(function(edge) {
    // *this* is the visitor
    // uses closure on id param
    if (edge.detach(id)) {
      this.results.push(edge);
    }
  });
  
  return this.resolve(visitor);
};

/*
 * @method parents finds all graphs in subgraph that depend on graph with given id.
 * @param string id - required id for the target graph.
 * @returns a visitor with the results field as array of ids of graphs that depend on the 
 *  target subgraph.
 */
simplegraph.prototype.parents = function parents(id) {

  var visitor = this.visitor(function(edge) {
    // *this* is the visitor
    // uses closure on id param
    if (!this.visited[edge.id] && edge.edges[id]) {
      this.results.push(edge);
    }
  });
    
  return this.resolve(visitor);
};

/*
 * @method subgraph finds all graphs in subgraph that the graph with given id depends on.
 * @returns a visitor with the results field as array of ids of graphs under the target 
 *  subgraph.
 */
simplegraph.prototype.subgraph = function subgraph() {

  var visitor = this.visitor(function(edge) {
    // *this* is the visitor
    // visitor id is the graph id on which visitor was created
    if (!this.visited[edge.id] && this.id !== edge.id) {
      this.results.push(edge);
    }
  });
  
  return this.resolve(visitor);
};

/*
 * @method descendant locates child or descendant with matching id in the graph or its 
 *  subgraph.  Uses the visitor in order to avoid throwing errors.  First match terminates 
 *  search.
 * @returns first matching child or descendant graph
 */
simplegraph.prototype.descendant = function descendant(id) {

  var child = false;
  
  var visitor = this.visitor(function(edge) {
    // uses closure on id param
    var item = edge.edges[id];
    
    if (item) {
      child = item;
      this.done();
    }
  });
  
  this.resolve(visitor);

  return child;
};

/*
 * @method list - alternate version of list iterator - shows deficiency of depth-first 
 *  traversal - uses the visitor.after() post-visit callback approach.
 * @returns results array of visited graphs
 */
simplegraph.prototype.list = function list() {

  var visitor = this.visitor();

  // assign nonce properties we can use in visit and after functions
  visitor.depth = -1;
  visitor.INDENT = 2;
  
  // explicit visit assignment - demonstrates flexibility given other properties to set.
  visitor.visit = function (edge) {
  
    // *this* is the visitor
    
    // unset depth after() visiting...
    this.depth += this.INDENT; 
    
    for (var i = 0; i < this.depth; i++) {
      this.results.push(' ');
    }
    
    if (edge.empty()) {
      this.results.push('-');
    } else {
      this.results.push('+');
    }
    
    this.results.push(' ' + edge.id + '\n');
  };
  
  // post-processing aop
  visitor.after = function (edge) {
    // *this* is the visitor
    this.depth -= this.INDENT;
  };
  
  return this.resolve(visitor).results.join('');
};

/*
 * returns the visitor's results array, depth first
 */
simplegraph.prototype.sort = function sort() {

  var visitor = this.visitor();
  
  visitor.after = function (edge) {
    
    if (!this.visited[edge.id]) {
    
      if (edge.empty()) {
        this.results.unshift(edge.id);
      } else {
        this.results.push(edge.id);
      }
    }
  };
  
  return this.resolve(visitor).results;
};
