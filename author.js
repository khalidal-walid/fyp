var width = 1200;
var height = 600;
var color = d3.scaleOrdinal(d3.schemeCategory10);
var profs = [];
var ttpJustDisplayed = false;
var ttp_searchbox = false;
var legJustDisplayed = false;
var leg_searchbox = false;

//read JSON
d3.json("author.json").then(function (graph) {
    document.addEventListener('click', hideTooltip)
    document.addEventListener('click', hideLegends)

    //array that gets the json data
    var data = {
        'nodes': []
    };

    //push nodes and link into the graph
    graph.nodes.forEach(function (d, i) {
        data.nodes.push({ node: d });
        data.nodes.push({ node: d });
    });

    //data layout
    var dataLayout = d3.forceSimulation(data.nodes)
    .force("x", d3.forceX(function(e,t){return 5*t-300}).strength(0.5))
    .force("y", d3.forceY(function(e,t){return t%5*150-300}).strength(0.1))
    .force("collide", d3.forceCollide(49).strength(1));

    //graph layout
    var graphLayout = d3.forceSimulation(graph.nodes)
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width /2 ).strength(1))
        .force("y", d3.forceY(height / 2).strength(1))
        .on("tick", ticked);

    var adjlist = [];

    //vecinos
    function neigh(a, b) {
        return a == b || adjlist[a + "-" + b];
    }

    var svg = d3.select("#viz")
        .attr('height', "auto")
        .attr('width', "auto")
        .attr('viewBox', [-width / width, -height / 3.6, width * 1.29, height * 1.5])

    var container = svg.append("g");

    //escala para el grosor de las lineas
    var path_scale = d3.scaleLinear()
        .range([4, 4]);

    svg.call(
        d3.zoom()
            .scaleExtent([.1, 4])
            .on("zoom", function () { container.attr("transform", d3.event.transform); })
    );

    var node = container.append("g").attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g").attr("class", "node")
        .append("circle")
        .attr("r", "5")
        .attr("fill", function (d) { return color(d.year); });



    node.on("focusin", focus).on("focusout", unfocus);

    node.on("mouseover", function (d) {
        var mousePos = d3.mouse(svg.node());
        var tooltip = d3.select("#tooltip");
        var legends = d3.select("#legends");

        legends.classed("hidden", false)
            .classed("show", true);

        tooltip
            .classed("hidden", false)
            .classed("show", true);

        tooltip.select("#tooltip-header")
            .html(

                '<div>' +
                '<h2>' + 'Title:' + '</h2>' +
                '</div > ' +

                '<div>' +
                '<h1>' +'<ul>'+ d.id +'</ul>'+ '</h1>' +
                '</div > ' 

            );

        
    tooltip.select("#tooltip-body")
            .html(
                '<div>' +
                '<h2>' + 'Reference:' + '</h2>' +
                '</div > ' +

                '<div>' +
                '<h1>' +'<ul><li>'+ d.target.join("</li><li>") +'</li></ul>'+ '</h1>' +
                '</div > ' 
                );
        ttpJustDisplayed = true;
        legJustDisplayed = true;
    })

    node.call(
        d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
    );

    var dataNode = container.append("g").attr("class", "dataNodes")
        .selectAll("text")
        .data(data.nodes)
        .enter()
        .append("text")
        .text(function (d, i) { return i % 2 == 0 ? "" : d.node.id; })
        .style("fill", "#555")
        .style("font-family", "Arial")
        .style("font-size", 12)
        .style("pointer-events", "none") // to prevent mouseover/drag capture
        .style("opacity", "0"); 

    var clickedCircle = svg.append("circle")
        .attr("class", "node-clicked")
        .attr("r", 16)
        .style("opacity", 0);

    function ticked() {

        node.call(updateNode);
        link.call(updateLink);

        dataLayout.alphaTarget(0.1).restart();
        dataNode.each(function (d, i) {
            if (i % 2 == 0) {
                d.x = d.node.x;
                d.y = d.node.y;
            } else {
                var b = this.getBBox();
                var diffX = d.x - d.node.x;
                var diffY = d.y - d.node.y;

                var dist = Math.sqrt(diffX * diffX + diffY * diffY);

                var shiftX = b.width * (diffX - dist) / (dist * 2);
                shiftX = Math.max(-b.width, Math.min(0, shiftX));
                var shiftY = 16;
                this.setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
            }
        });
        dataNode.call(updateNode);

    }

    function fixna(x) {
        if (isFinite(x)) return x;
        return 0;
    }

    function focus(d) {
        console.log(d)
        var index = d3.select(d3.event.target).datum().index;
        console.log("focus: " + index)
        node.style("opacity", function (o) {
            return neigh(index, o.index) ? 1 : 0.1;
        });
        dataNode.attr("display", function (o) {
            return neigh(index, o.node.index) ? "block" : "none";
        });

        clickedCircle
            .attr("cx", d.x)
            .attr("cy", d.y)
            .transition().duration(300)
            .style("opacity", 1);
    }

    function hideTooltip(e) {
        if (ttpJustDisplayed) {
            e.preventDefault()
            ttpJustDisplayed = false;

            if (ttp_searchbox) {
                console.log("lo escondere!")
                console.log(ttpJustDisplayed)
                ttp_searchbox = false;
                resetFocus();
            }

            return;
        }
        let ttp = document.querySelector('.ttp.show')
        console.log(ttp);
        if (!ttp) return
        if (ttp.contains(e.target)) return

        console.log("pass");


        resetFocus();
    }

    function hideLegends(e) {
        if (legJustDisplayed) {
            e.preventDefault()
            legJustDisplayed = false;

            if (leg_searchbox) {
                console.log("lo escondere!")
                console.log(legJustDisplayed)
                leg_searchbox = false;
                resetFocus();
            }

            return;
        }
        let leg = document.querySelector('.leg.show')
        console.log(leg);
        if (!leg) return
        if (leg.contains(e.target)) return

        console.log("pass");


        resetFocus();
    }

    function resetFocus() {
        d3.select("#tooltip")
            .classed("hidden", true)
            .classed("show", false);
        d3.select("#legends")
            .classed("hidden", true)
            .classed("show", false);
        dataNode.attr("display", "block");
        node.style("opacity", 1);
        link.style("opacity", 1);
    }

    function unfocus() {
        document.addEventListener('click', hideTooltip)
        document.addEventListener('click', hideLegends)
    }

    function updateNode(node) {
        node.attr("transform", function (d) {
            return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
        });
        
    }

    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        if (!d3.event.active) graphLayout.alphaTarget(0).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) graphLayout.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    makeProfList(graph);
    loadAutocomplete();



    function loadAutocomplete() {

        const autoCompletejs = new autoComplete({
            data: {
                src: profs,
                key: ["name"],
                cache: true
            },

            placeHolder: " Title",
            selector: "#autoComplete",
            threshold: 0,
            debounce: 0,
            highlight: true,
            maxResults: 5,
            resultsList: {
                render: true,
                container: source => {
                    source.setAttribute("id", "autoComplete_list");
                },
                destination: document.querySelector("#autoComplete"),
                position: "afterend",
                element: "ul"
            },
            resultItem: {
                content: (data, source) => {
                    source.innerHTML = data.match;
                },
                element: "li"
            },


            onSelection: feedback => {

                const selection = feedback.selection.value;

                let select = document.querySelector("#autoComplete")
                select.value = ''
                console.log("autocomplete: " + selection.id)
                let nodes = d3.selectAll('g.node')

                let node = nodes.filter((d, i, g) => d.id === selection.name)
                console.log(node);
                let current_node = node.node().__data__;
                console.log(current_node);

                focus_searcher(current_node, selection.id);
            }
            
        });

    }


    function focus_searcher(d, index) {
        console.log(d)
        console.log("focus: " + index)
        ttp_searchbox = true;
        var tooltip = d3.select("#tooltip");
        var legends = d3.select("#legends");

        tooltip.style("left", 70 + "%")
            .style("top", 20 + "px")
            .classed("hidden", false)
            .classed("show", true);

        legends.classed("hidden", false)
            .classed("show", true);

        tooltip.select("#tooltip-header")
                .html(

                    '<div>' +
                    '<h2>' + 'Title:' + '</h2>' +
                    '</div > ' +

                    '<div>' +
                    '<h1>' +'<ul>'+ d.id +'</ul>'+ '</h1>' +
                    '</div > ' 

                );

            
        tooltip.select("#tooltip-body")
                .html(
                    '<div>' +
                    '<h2>' + 'Reference:' + '</h2>' +
                    '</div > ' +

                    '<div>' +
                    '<h1>' +'<ul><li>'+ d.target.join("</li><li>") +'</li></ul>'+ '</h1>' +
                    '</div > ' 
                );
        ttpJustDisplayed = true;
        legJustDisplayed = true;


        node.style("opacity", function (o) {
            return neigh(index, o.index) ? 1 : 0.1;
        });

         clickedCircle
         .attr("cx", d.x)
         .attr("cy", d.y)
         .transition().duration(300)
         .style("opacity", 1);
    }

});


function makeProfList(rData) {
    rData.nodes.forEach((node, index) => {
        profs.push({ name: node.id, id: index })
    })
    return rData
  }