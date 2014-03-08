function plotSelectedItems( selection ) { 

    var element = "#item-table";

    // clear target element
    d3.select(element).html("");

    d3.select(element).html('<p>' + selection.items.length + ' of ' + depth + ' selected</p>')
    
    var table = d3.select(element).append("table");
    var thead = table.append("thead");
    var tbody = table.append("tbody");

    thead.append("tr")
            .selectAll("th")
            .data(attributes)
        .enter()
            .append("th")
                .style("background-color", selections.getColor( selection ) )
                .text(function(d) { return d.name; })
                .on("click", function(k) { // is attribute object

                    if ( k.type === "float" || k.type === "integer" ) {
                        plotHistogram( k );
                    }

                    thead.selectAll('th').data(attributes).text(function(d) { return d.name; });
                    d3.select(this).html( ( k.sort > 0 ? "&#x25B2;" : "&#x25BC;" ) + " " + k.name );
                    rows.sort( function(a, b) { 
                        switch ( k.type ) {
                            case 'integer':
                                // fall-through
                            case 'float':
                                return k.sort * ( k.values[a] - k.values[b] );
                            case 'id':
                                // fall-through
                            case 'string':
                                // fall-through
                            default:
                                if ( k.values[a] < k.values[b] ) {
                                    return k.sort * -1;
                                }
                                if ( k.values[a] > k.values[b] ) {
                                    return k.sort * 1;
                                }
                                
                                return 0;
                        }
                    });
                    // switch sort order
                    k.sort = k.sort * -1;
                });

    var rows = tbody.selectAll("tr")
            .data(selection.items)
        .enter()
            .append("tr")
            .each(function(d,i) { 
                d3.select(this).selectAll("td")
                    .data(attributes)
                .enter()
                    .append("td")
                    .text(function(a) { return a.values[selection.items[i]] });
            });

    console.log( selections );

}


function plotHistogram( attribute ) {
    var element = "#item-vis";

    // A formatter for counts.
    var format = d3.format(".00r");
    
    if ( attribute.type === "float" ) {
        format = d3.format(",.00r");
    }
    if ( attribute.type === "integer" ) {
        format = d3.format("d");
    }

    var margin = {top: 0, right: 10, bottom: 20, left: 10},
        width = 300 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([attribute.min, attribute.max])
        .range([0, width]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    // clear
    d3.select(element).html("");

    var svg = d3.select(element).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var histograms = [];

    console.log( selections );
    // for each selection
    for ( var s = 0; s < selections.getSize(); ++s ) {

        var values = [];

        var selection = selections.getSelection(s);

        console.log( "Rendering selection " + (s+1) + " of " + selections.getSize() + " with size " + selection.items.length + " and color " + selections.getColor( selection ) );

        for ( var i = 0; i < selection.items.length; ++i ) {
            values.push( attribute.values[selection.items[i]] );
        }

        // Generate a histogram using twenty uniformly-spaced bins.
        var histogram = d3.layout.histogram()
            .frequency(false)
            .bins(x.ticks(20))
            (values);

        for ( var i = 0; i < histogram.length; ++i ) {
            histogram[i].color = selections.getColor( selection );
            histogram[i].dx = histogram[i].dx/selections.getSize();
            histogram[i].x = histogram[i].x + s*histogram[i].dx
        }

        histograms.push( histogram );
    }

    var y = d3.scale.linear()
        .domain([0, d3.max(histograms, function(histogram) { return d3.max( histogram, function(d) { return d.y; } ); })])
        .range([height, 0]);

    var histogram = svg.selectAll(".histogram")
            .data( histograms )
        .enter().append("g")
            .attr("class", "histogram");

    var bar = histogram.selectAll(".bar")   
            .data( function( d ) { return ( d ); } )
        .enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
    
    bar.append("rect")
        .attr("x", 1)
        .attr("width", function(d) { return x(d.dx+attribute.min) - 1; }) //x(histograms[0].dx+attribute.min) - 1
        .attr("height", function(d) { return height - y(d.y); })
        .style('fill-opacity', 0.5 )
        .style('fill', function(d){ return (d.color) } );
    /*
    bar.append("rect")
        .attr("x", 1)
        .attr("width", function(d) { return x(d.dx+attribute.min) - 1; }) //x(histograms[0].dx+attribute.min) - 1
        .attr("height", function(d) { return 2; })
        .style('fill-opacity', 0.5 )
        .style('fill', function(d){ return (d.color) } );
    */
    /*
    var bar = svg.selectAll(".bar")
        .data(histograms)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].dx+attribute.min) - 1 )
        .attr("height", function(d, i ) { console.log( i + " -- " + y(d.y) ); return height - y(d.y); })
        .style('fill-opacity', 0.5 )
        .style('fill', selections.getColor(selection) );
    */
    /*
    bar.append("text")
        .attr("dy", ".75em")
        .attr("y", 6)
        .attr("x", x(data[0].dx) / 2)
        .attr("text-anchor", "middle")
        .text(function(d) { return format(d.y); });
    */

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
}

/*
    $( ".attribute-header" ).on( "click", function(){
        if ( !selectedAttributes[this.getAttribute( 'data-attribute-id' )] ) {
            selectedAttributes[this.getAttribute( 'data-attribute-id' )] = true;

            $(EventManager).trigger( "attribute-selection-added", { id: this.getAttribute( 'data-attribute-id' ) } );
        }
        else {
            delete selectedAttributes[this.getAttribute( 'data-attribute-id' )];   

            $(EventManager).trigger( "attribute-selection-removed", { id: this.getAttribute( 'data-attribute-id' ) } );            
        }

        $(this).toggleClass( 'selected' );
    });


$(EventManager).bind( "attribute-selection-added", function( event, data ) {
    console.log( "attribute " + attributes[data.id].name + " was added to selection." );
});

$(EventManager).bind( "attribute-selection-removed", function( event, data ) {
    console.log( "attribute " + attributes[data.id].name + " was removed from selection." );
});
*/