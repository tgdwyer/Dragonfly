/**
 * A graph is just a large object with endpoints that
 * can be pressed with side effects.
 * This allows us to interact with the mutable nature
 * of d3 and force directed layouts within the clean
 * world of Redux.
 */
let d3 = require("d3");
let cola = require("./vendor/cola.min.js");
let levelgraph = require("levelgraph");
let level = require("level-browserify");

/**
 * Factory for creating the graph.
 * Returns an object with endpoints for interacting
 * with the graph.
 */
const graphFactory = (documentId) => {

    if (typeof documentId !== "string" || documentId === "") {
        throw new Error("Document Id passed into graph isn't a string.");
    }

    /**
     * nodeMap allows hash lookup of nodes.
     */
    let nodeMap = new Map();
    let predicateTypeToColorMap = new Map();
    let tripletsDB = levelgraph(level(`Userdb-${Math.random()*100}`));
    let nodes = [];
    let links = [];

    const width = 600,
          height = 400;
    
    // Here we are creating a responsive svg element.
    let svg = d3.select(`#${documentId}`)
                .append("div")
                .classed("svg-container", true)
                .append("svg")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .classed("svg-content-responsive", true);


    /**
     * Set up [webcola](http://marvl.infotech.monash.edu/webcola/).
     * Later we'll be restarting the simulation whenever we mutate
     * the node or link lists.
     */
    let simulation = cola.d3adaptor(d3)
                         .avoidOverlaps(true)
                         .jaccardLinkLengths(50)
                         .handleDisconnected(false) // THIS MUST BE FALSE OR GRAPH JUMPS
                         .size([width, height])
                         .nodes(nodes)
                         .links(links)
                         .on("tick", tick);
    
    /**
     * Here we define the arrow heads to be used later.
     * Each unique arrow head needs to be created.
     */
    const defs = svg.append("defs");

    /**
     * Appends a new marker to the dom, for the new
     * marker color.
     * @param {defs DOMElement} definitionElement 
     * @param {string} color valid css color string
     */
    const createColorMarker = (definitionElement, color) => {
        definitionElement.append("marker")
            .attr("id",`arrow-${color}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 16)
            .attr("refY", -1.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("fill", color)
            .attr("orient", "auto")
            .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("class","arrowHead");
    }
    
    
    // Define svg groups
    let g = svg.append("g"),
        link = g.append("g")
                .selectAll(".link"),
        node = g.append("g")
                .selectAll(".node");
    
    /**
     * Maps node and edge data to the visualisation.
     */
    function tick(){
        node.attr("transform", d => `translate(${d.x},${d.y})`)
        link.attr("d", d => {
            let dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M"+d.source.x+","+d.source.y+"A"+dr+","+dr+" 0 0,1 "+d.target.x + ","+d.target.y;
        });
    }

    /**
     * restart function adds and removes nodes.
     * It also restarts the simulation.
     * This is where aesthetics can be changed.
     */
    function restart(){
        /////// NODE ///////

        node = node.data(nodes, d => d.index);
        node.exit().remove();
        node = node.enter()
                   .append("g")
                   .call(simulation.drag)
                   .merge(node);
        
        // Here we add node beauty.
        // To fit nodes to the short-name calculate BBox
        // from https://bl.ocks.org/mbostock/1160929
        let text = node.append("text")
                    .attr("x", 0)
                    .attr("y", 20)
                    .attr("dy", 0)
                    .attr("text-anchor", "start")
                    .style("font", "100 22px Helvetica Neue")
                    .text(d => d.hash);
        
        // This trick from http://stackoverflow.com/a/27076107
        // we get the bounding box from the parent (which contains the text)
        node.insert("rect", "text")     // The second arg is what the rect will sit behind.
                .attr("fill", "red")
                .attr("width", function() { return this.parentNode.getBBox().width })
                .attr("height", function() { return this.parentNode.getBBox().height })
            
        /////// LINK ///////
        link = link.data(links, d => d.source.index + "-" + d.target.index)
        link.exit().remove();

        link = link.enter()
                   .append("path")
                   .attr("class", "line")
                   .attr("stroke-width", 2)
                   .attr("stroke", d => predicateTypeToColorMap.get(d.predicate) || "black")
                   .attr("fill", "none")
                   .attr("marker-end",d => `url(#arrow-${predicateTypeToColorMap.get(d.predicate)})`)   // This needs to change to the color.
                   .merge(link);

        // Restart the simulation.
        simulation.links(links);    // Required because we create new link lists
        simulation.start(10, 15, 20);
    }

    // Helper function for updating links after node mutations.
    // Calls a function after links added.
    function createNewLinks(){
        tripletsDB.get({}, (err, l) => {
            if (err){
                throw new Error(err);
            }
            // Create edges based on LevelGraph triplets
            links = l.map(({subject, predicate, object}) => {
                let source = nodeMap.get(subject);
                let target = nodeMap.get(object);
                return { source, target, predicate }
            });   
            restart()
        })
    }

    function addNode(nodeObject){
        // Check that hash exists
        if (!(nodeObject.hash)) {
            var e = new Error("Node requires a hash field.");
            console.error(e);
            return
        }

        // Add node to graph
        if (!nodeMap.has(nodeObject.hash)){
            // Set the node
            nodes.push(nodeObject)
            nodeMap.set(nodeObject.hash, nodeObject);
        }
        createNewLinks();
    }

    function addTriplet(tripletObject){
        /**
         * Check that minimum requirements are met.
         */
        if (tripletObject === undefined) {
            var e = new Error("TripletObject undefined");
            console.error(e);
            return
        }

        // Node needs a unique hash associated with it.
        let subject = tripletObject.subject,
            predicate = tripletObject.predicate,
            object = tripletObject.object;

        if (!(subject && predicate && object && true)){
            throw new Error("Triplets added need to include all three fields.")
        }

        // Check that hash exists
        if (!(subject.hash && object.hash)) {
            var e = new Error("Subject and Object require a hash field.");
            console.error(e);
            return
        }

        // Check that type field exists on predicate
        if (!predicate.type) {
            var e = new Error("Predicate requires type field.");
            console.error(e);
            return
        }

        // Check that type field is a string on predicate
        if (typeof predicate.type !== "string") {
            var e = new Error("Predicate type field must be a string");
            console.error(e);
            return
        }
        
        /**
         * If a predicate type already has a color,
         * it is not redefined.
         */
        if (!predicateTypeToColorMap.has(predicate.type)){
            predicateTypeToColorMap.set(predicate.type, predicate.color);

            // Create an arrow head for the new color
            createColorMarker(defs, predicate.color);
        }

        /**
         * Put the triplet into the LevelGraph database
         * and mutates the d3 nodes and links list to
         * visually pop on the node/s.
         */
        tripletsDB.put({
            subject: subject.hash,
            predicate: predicate.type,
            object: object.hash
        }, err => {
            if (err){
                throw new Error(err);
            }
            
            // Add nodes to graph
            if (!nodeMap.has(subject.hash)){
                // Set the node
                nodes.push(subject)
                nodeMap.set(subject.hash, subject);
            }
            if (!nodeMap.has(object.hash)){
                nodes.push(object)
                nodeMap.set(object.hash, object);
            }

            createNewLinks();
        });
    }
    /**
     * Removes the node and all triplets associated with it.
     * @param {String} nodeHash hash of the node to remove.
     */
    function removeNode(nodeHash){
        tripletsDB.get({subject: nodeHash}, function(err, l1){
            if (err){
                return console.error(err)
            }
            tripletsDB.get({object: nodeHash}, function(err, l2){
                if (err){
                    return console.error(err)
                }
                // Check if the node exists
                if (l1.length + l2.length === 0){
                    return console.error("There was nothing to remove")
                }

                [...l1, ...l2].forEach(triplet => tripletsDB.del(triplet, function(err){
                    if (err){
                        return console.error(err);
                    }
                }));


                // Remove the node
                let nodeIndex = -1;
                for (let i = 0; i < nodes.length; i++){
                    if (nodes[i].hash === nodeHash){
                        nodeIndex = i;
                        break;
                    }
                }
                if (nodeIndex === -1){
                    return console.error("There is no node");
                }

                nodeMap.delete(nodeHash);
                nodes.splice(nodeIndex, 1);

                createNewLinks();
            });
        });
    }

    return {
        addTriplet,
        removeNode
    }
}

export default graphFactory;
