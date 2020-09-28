//Dimensions and colors
var width = 1200;
var height = 300;
var color = d3.scaleOrdinal(d3.schemeCategory10);
var profs = [];
var ttpJustDisplayed = false;
var ttp_searchbox = false;

//read JSON
d3.json("data.json").then(function (graph) {
    document.addEventListener('click', hideTooltip)

    //array that gets the json data
    var data = {
        'nodes': [],
        'links': []
    };

    //push nodes and link into the graph
    graph.nodes.forEach(function (d, i) {
        data.nodes.push({ node: d });
        data.nodes.push({ node: d });
        data.links.push({
            source: i * 2,
            target: i * 2 + 1
        });
    });

    //data layout
    var dataLayout = d3.forceSimulation(data.nodes)
        .force("charge", d3.forceManyBody().strength(-50))
        .force("link", d3.forceLink(data.links).distance(0).strength(2));

    //graph layout
    var graphLayout = d3.forceSimulation(graph.nodes)
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(width / 2, height / 2))
        // .force("x", d3.forceX(width / 2).strength(1))
         .force("y", d3.forceY(height / 2).strength(1))
        .force("link", d3.forceLink(graph.links).id(function (d) { return d.id; }).distance(500).strength(1))
        .on("tick", ticked);

    var adjlist = [];

    //links
    graph.links.forEach(function (d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });


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
        .domain([0, d3.max(graph.links, function (d) {
            return d.value;
        })])
        .range([1, 1]);

    var node_scale = d3.scaleLinear()
        .domain([0, d3.max(graph.links, function (d) {
            return d.value;
        })])
        .range([4, 4]);

    svg.call(
        d3.zoom()
            .scaleExtent([.1, 4])
            .on("zoom", function () { container.attr("transform", d3.event.transform); })
    );

    var link = container.append("g").attr("class", "links")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        // .attr("stroke", "#aaa")
        // .attr("stroke-width", function (d, i) {
        //     return path_scale(d.value);
        // })
        .attr("fill", "none");
        // .style("opacity", "0");


    var node = container.append("g").attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g").attr("class", "node")
        .append("circle")
        .attr("r", function (d, i) {
            return node_scale(i);
        })
        .attr("fill", function (d) { return color(d.group); });



    node.on("focusin", focus).on("focusout", unfocus);

    node.on("mouseover", function (d) {
        var mousePos = d3.mouse(svg.node());
        var tooltip = d3.select("#tooltip");

        tooltip.style("left", mousePos[0] + 20 + "px")
            .style("top", mousePos[1] - 20 + "px")
            .classed("hidden", false)
            .classed("show", true);

        tooltip.select("#tooltip-header")
            .classed("tooltip-header", true)
            .text(d.id);

        tooltip.select("#tooltip-body")
            .html(
                // '<div>' +
                // '<a href="https://www.google.com" target="_blank"> <i class="fas fa-user-o"></i> ' + d.group + ' investigadores</a >' +
                // '</div > ' +

                // '<div> ' +
                // '<i class="fas fa-sticky-note-o"></i> ' + d.group + ' publicaciones' +
                // '</div>'
            );
        ttpJustDisplayed = true;
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

    function ticked() {

        node.call(updateNode);
        link.call(updateLink);

        dataLayout.alphaTarget(0.3).restart();
        dataNode.each(function (d, i) {
            if (i % 2 == 0) {
                d.x = d.node.x;
                d.y = d.node.y;
            } else {
                var b = this.getBBox();
                // var b = d3.select("#viz").node().getBoundingClientRect();
                // console.log(b)
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
        link.style("opacity", function (o) {
            return o.source.index == index || o.target.index == index ? 1 : 0.1;
        });
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

    function resetFocus() {
        d3.select("#tooltip")
            .classed("hidden", true)
            .classed("show", false);
        dataNode.attr("display", "block");
        node.style("opacity", 1);
        link.style("opacity", 1);
    }

    function unfocus() {
        document.addEventListener('click', hideTooltip)
        // dataNode.attr("display", "block");
        // node.style("opacity", 1);
        // link.style("opacity", 1);
    }


    function updateLink(link) {
        link.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        });
        link.style("opacity", "1")
    }

    function updateNode(node) {
        node.attr("transform", function (d) {
            return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
        });
    }

    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        if (!d3.event.active) graphLayout.alphaTarget(0.3).restart();
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
            
            placeHolder: " Name",
            selector: "#autoComplete",
            threshold: 0,
            debounce: 0,
            // searchEngine: "strict",
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

        tooltip.style("left", 70 + "%")
            .style("top", 20 + "px")
            .classed("hidden", false)
            .classed("show", true);

        tooltip.select("#tooltip-header")
            .classed("tooltip-header", true)
            .text(d.id);

        tooltip.select("#tooltip-body")
            .html(
                '<div>' +
                '<a href="https://www.google.com" target="_blank"> <i class="fas fa-user-o"></i> ' + d.target + '</a >' +
                '</div > ' 

                // '<div>' +
                // '<a href="https://www.google.com" target="_blank"> <i class="fas fa-user-o"></i> ' + d.group + ' investigadores</a >' +
                // '</div > ' +

                // '<div> ' +
                // '<i class="fas fa-sticky-note-o"></i> ' + d.group + ' publicaciones' +
                // '</div>'
            );
        ttpJustDisplayed = true;


        node.style("opacity", function (o) {
            return neigh(index, o.index) ? 1 : 0.1;
        });
        // dataNode.attr("display", function (o) {
        //     return neigh(index, o.node.index) ? "block" : "none";
        // });
        // link.style("opacity", function (o) {
        //     return o.source.index == index || o.target.index == index ? 1 : 0.1;
        // });
         dataNode.style("opacity", function (o) {
                return neigh(index, o.node.index) ? 1 : 0.1;
        });
        link.attr("stroke", "#aaa")
            .attr("stroke-width", function (o) {
                return o.source.index == index || o.target.index == index ? 1 : 0.1;
         });
    }

});

function positionLink(d) {
    return "M" + d[0].x + "," + d[0].y
        + "S" + d[1].x + "," + d[1].y
        + " " + d[2].x + "," + d[2].y;
}


function makeProfList(rData) {
    rData.nodes.forEach((node, index) => {
        profs.push({ name: node.id, id: index })
    })
    return rData
}