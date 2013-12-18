
// wrapped so we could try it in firebug/browser
if (typeof module != 'undefined' && module.exports) {
  module.exports = Graph;
}

/*
 * Graph constructor (new is optional)
 * param string id - required
 */
function Graph(id) {

  if (!(this instanceof Graph)) {
    return new Graph(id)
  }
  
  if (!id || typeof id != 'string') {
    throw new Error('Graph() requires non-empty string id argument.')
  }
  
  this.id = id;
  this.edges = [];
}

/*
* @method resolve - performs a recursive visit through graph and subgraphs. Sets an error 
*   field with an Error instance if a cycle is detected.
* @param object visitor - optional - collector with interface provided by graph#visitor() 
*   method.
* @returns visitor
*/
Graph.prototype.resolve = function resolve(visitor) {

  // code smell ~ four guard clauses
  
  var id = this.id;
  var edges;
  var length;
  
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
    length = edges.length;
    for (var i = 0; i < length; ++i) {
      edges[i].resolve(visitor);
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
Graph.prototype.visitor = function visitor(fn) {

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
 * return index of child edge with matching id
 */
Graph.prototype.indexOf = function indexOf(id) {

  var edges = this.edges;
  var length = edges.length;
  
  for (var i = 0; i < length; ++i) {
    if (edges[i].id === id) {
      return i;
    }
  }
  
  return -1;
};

// TRAVERSAL METHODS WITH RESOLVE AND VISITOR

/*
 * attach child to current graph
 */
Graph.prototype.attach = function attach(edge) {

  if (this.indexOf(edge.id) === -1) {
  
    this.edges.push(edge);
    
    edge.resolve();
    
    return edge;
  }
  
  return false;
};

/*
 * detach child with matching id
 */
Graph.prototype.detach = function detach(id) {
  
  var index = this.indexOf(id);

  if (index !== -1) {
    return this.edges.splice(index, 1)[0];
  }
  
  return false;
};

/*
* @method remove detaches all occurrences of subgraph from the graph and its descendants.
* param string id - required id of the subgraph to be detachd
* returns an array of graphs from which the target has been detachd.
*/
Graph.prototype.remove = function remove(id) {

  var visitor = this.visitor(function(edge) {
    // uses closure on id param
    if (edge.detach(id)) {
      // *this* is the visitor
      this.results.push(edge);
    }
  });
  
  return this.resolve(visitor);
};

/*
 * @method dependants finds all graphs in subgraph that depend on graph with given id.
 * @param string id - required id for the target graph.
 * @returns a visitor with the results field as array of ids of graphs that depend on the 
 *  target subgraph.
 */
Graph.prototype.dependants = function dependants(id) {

  var visitor = this.visitor(function(edge) {
    // *this* is the visitor
    // uses closure on id param
    if (!this.visited[edge.id] && edge.indexOf(id) !== -1) {
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
Graph.prototype.subgraph = function subgraph() {

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
 * @method size counts all graphs in subgraph, and includes the current graph.
 * @returns the number of results.
 */
Graph.prototype.size = function size() {
  return this.subgraph().results.length + 1;
};

/*
 * @method find locates child or descendant with matching id in the graph or its subgraph.
 *  Uses the visitor in order to avoid throwing errors.  First match terminates search.
 * @returns first matching child or descendant graph
 */
Graph.prototype.find = function find(id) {

  var child = false;
  
  var visitor = this.visitor(function(edge) {

    // uses closure on id param
    var index = edge.indexOf(id);
    
    if (index !== -1) {
    
      child = edge.edges[index];
      
      // terminate the search in resolve() on this visitor
      // *this* is the visitor
      this.done(); 
    }
  })
  
  this.resolve(visitor);

  return child;
};

// recursive print, copied+modified from Processing to JavaScript
// ch. 7 of Visualizing Data by Ben Fry, O'Reilly, 2007
/*Graph.prototype.list = list;
function list(depth) {
  
  var out = [];
  
  (typeof depth == 'number' && depth >= 0) || (depth = 0)
  
  for (var i = 0; i < depth; i++) {
      out.push('  '); // console
  }
  
  out.push(this.id); // console
  
  if (this.edges.length) {
  
    out.push(':\n');
    
    for (var i = 0; i < this.edges.length; i++) {
      out.push(this.edges[i].list(depth + 1)); // ye olde recursion...
    }

  } else {
    out.push('\n');
  }
  
  return out.join('');
}
*/

/*
 * @method list - alternate version of list iterator - shows deficiency of depth-first 
 *  traversal - uses the visitor.after() post-visit callback approach.
 * @returns results array of visited graphs
 */
Graph.prototype.list = function list() {

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

    if (edge.edges.length > 0) {
      this.results.push('+');
    } else {
      this.results.push('-');
    }
    
    this.results.push(' ' + edge.id + '\n');
  };
  
  // post-processing aop
  visitor.after = function (edge) {
    // *this* is the visitor
    this.depth -= this.INDENT;
  }
  
  return this.resolve(visitor).results.join('');
};

/*
 * returns the visitor's results array, depth first
 */
Graph.prototype.sort = function sort() {

  var visitor = this.visitor();
  
  visitor.after = function (edge) {
    
    // *this* is the visitor
    if (!this.visited[edge.id]) {
      if (edge.edges.length > 0) {
        this.results.push(edge.id);
      } else {
        this.results.unshift(edge.id);
      }
    }
  };
  
  return this.resolve(visitor).results;
};
