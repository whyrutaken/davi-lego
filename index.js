const dataUrl = "https://raw.githubusercontent.com/whyrutaken/davi-lego/main/main_themes_and_number_sets.csv";
const hierarchyDataUrl = "https://raw.githubusercontent.com/whyrutaken/davi-lego/main/hierarchy_data.csv";
const tableDataUrl = "https://raw.githubusercontent.com/whyrutaken/davi-lego/main/root_parent_themes.csv"
//const colorArray = ["#3957ff", "#d3fe14", "#c9080a", "#fec7f8", "#0b7b3e", "#0bf0e9", "#c203c8", "#fd9b39", "#888593", "#906407", "#98ba7f", "#fe6794", "#10b0ff", "#ac7bff", "#fee7c0", "#964c63", "#1da49c", "#0ad811", "#bbd9fd", "#fe6cfe", "#297192", "#d1a09c", "#78579e", "#81ffad", "#739400", "#ca6949", "#d9bf01", "#646a58", "#d5097e", "#bb73a9", "#ccf6e9", "#9cb4b6", "#b6a7d4", "#9e8c62", "#6e83c8", "#01af64", "#a71afd", "#cfe589", "#d4ccd1", "#fd4109", "#bf8f0e", "#2f786e", "#4ed1a5", "#d8bb7d", "#a54509", "#6a9276", "#a4777a", "#fc12c9", "#606f15", "#3cc4d9", "#f31c4e", "#73616f", "#f097c6", "#fc8772", "#92a6fe", "#875b44", "#699ab3", "#94bc19", "#7d5bf0", "#d24dfe", "#c85b74", "#68ff57", "#b62347", "#994b91", "#646b8c", "#977ab4", "#d694fd", "#c4d5b5", "#fdc4bd", "#1cae05", "#7bd972", "#e9700a", "#d08f5d", "#8bb9e1", "#fde945", "#a29d98", "#1682fb", "#9ad9e0", "#d6cafe", "#8d8328", "#b091a7", "#647579", "#1f8d11", "#e7eafd", "#b9660b", "#a4a644", "#fec24c", "#b1168c", "#188cc1", "#7ab297", "#4468ae", "#c949a6", "#d48295", "#eb6dc2", "#d5b0cb", "#ff9ffb", "#fdb082", "#af4d44", "#a759c4", "#a9e03a", "#0d906b", "#9ee3bd", "#5b8846", "#0d8995", "#f25c58", "#70ae4f", "#847f74", "#9094bb", "#ffe2f1", "#a67149", "#936c8e", "#d04907", "#c3b8a6", "#cef8c4", "#7a9293", "#fda2ab", "#2ef6c5", "#807242", "#cb94cc", "#b6bdd0", "#b5c75d", "#fde189", "#b7ff80", "#fa2d8e", "#839a5f", "#28c2b5", "#e5e9e1", "#bc79d8", "#7ed8fe", "#9f20c3", "#4f7a5b", "#f511fd", "#09c959", "#bcd0ce"];
const colorArray = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"];

const stream_graph_id = '#stream_graph';
const bar_graph_id = '#bar_graph';
const tree_graph_id = '#tree_map';
const table_check_box = '#table_check_box';
const tree_label_id = "#tree_label";

const bar_chart_width = 300;
const stream_chart_width = 700;
const stream_chart_height = 350;
const bar_chart_height = stream_chart_height + 50;
const defaultYear = 2000;

const tree_chart_width = 932;
const tree_chart_height = 3000;
const tree_chart_node_size = 25;

var chosenThemes = new Set()
var clicked = 0;


function button(){
    clicked = 1;
    Papa.parse(tableDataUrl, config_table);

}

function generate_table_checkbox(data, chosenThemes) {   

    if (clicked == 1){
        let tabulate = d3.selectAll(table_check_box);
        tabulate.selectAll('table').remove();
        data = data.slice().sort((a, b) => d3.descending(a.name, b.name));
    }
      
    let dataAsArray = null;

    let config = {
        download: true,
        dynamicTyping: true,
        header: true,
        complete: function (results) {
            dataAsArray = Array.from(results.data);

            // generate_stream_graph(dataAsArray, chosenThemes);
            update_bar_graph(dataAsArray, defaultYear);
        }
    }
    Papa.parse(dataUrl, config)

    var columns = ["name"];

    var tabulate = function (data, columns) {
        var table = d3.select(table_check_box).append('table')
        var thead = table.append('thead')
        var tbody = table.append('tbody')

        thead.append('tr')
            .selectAll('th')
            .data(columns)
            .enter()
            .append('th')
            .text(function (d) { return d.name })

        var rows = tbody.selectAll('tr')    
            .data(data)
            .enter()
            .append('tr')
            

        var cells = rows.selectAll('td')
            .data(function (row) {
                return columns.map(function (column) {
                    return { column: column, value: row[column] }
                })
            })
            .enter()
            .append('td')
            .text(function (d) { return d.value })
            .append("input")
            .attr("type", "checkbox")
            .style("float", "left")
            .attr("id", function (d) { return d.value; })
            .on("click", onClick);

        function onClick(d) {
            if (this.checked) {
                chosenThemes.add(this.id)
                generate_stream_graph(dataAsArray, chosenThemes);
            }
            else {
                chosenThemes.delete(this.id)
                generate_stream_graph(dataAsArray, chosenThemes);
            }
        }

        return table, chosenThemes;
    }

    var table, chosenThemes = tabulate(data, columns)



}


function generate_stream_graph(data, chosenThemes) {

    d3.select(stream_graph_id).selectChildren().remove();


    const keys = [...new Set(d3.map(data, d => d.root_theme_name))]
        .filter(d => d !== undefined);

    let formattedData = FormatStreamData(data, keys);
    let filteredData = formattedData.filter(d => chosenThemes.has(d.root_theme_name));


    const X = d3.map(filteredData, d => d.year);
    const Y = d3.map(filteredData, d => d.num_set_per_year);
    const Z = d3.map(filteredData, d => d.root_theme_name);

    let margin = { top: 40, right: 30, bottom: 10, left: 10 },
        width = stream_chart_width - margin.left - margin.right,
        height = stream_chart_height - margin.top - margin.bottom;

    let yearsWithSets = filteredData.filter(d => d.num_set_per_year > 0);
    var earliestSet = yearsWithSets.reduce((prev, curr) => prev.year < curr.year ? prev : curr);
    var latestSet = yearsWithSets.reduce((prev, curr) => prev.year > curr.year ? prev : curr);

    const xDomain = [earliestSet.year, latestSet.year]; // d3.extent(X);
    const zDomain = new d3.InternSet(Z);

    const I = d3.range(X.length).filter(i => zDomain.has(Z[i]));

    // append the svg object to the body of the page
    var svg = d3.select(stream_graph_id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // x axis
    const xScale = d3.scaleLinear()
        .domain(d3.extent(filteredData, function (d) { return d.year; }))
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).tickSize(-height).ticks(10))
        .select(".domain").remove();


    // Customization
    svg.selectAll(".tick line").attr("stroke", "#b8b8b8")

    // Add X axis label:
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", 85)
        .attr("y", height - 20)
        .text("Time (year)");

    // y axis
    const yType = d3.scaleLinear;
    const yRange = [height, 0];


    const stackSeries = d3.stack()
        .keys(zDomain)
        .value(([x, I], z) => Y[I.get(z)])
        .order(d3.stackOrderAppearance)
        .offset(d3.stackOffsetSilhouette)
        (d3.rollup(I, ([i]) => i, i => X[i], i => Z[i]))
        .map(s => s.map(d => Object.assign(d, { i: d.data[1].get(s.key) })));

    const yDomain = d3.extent(stackSeries.flat(2));

    //  const xScale = xType(xDomain, xRange);
    const yScale = yType(yDomain, yRange);
    const color = d3.scaleOrdinal().domain(zDomain)
        .range(colorArray);


    const areaGenerator = d3.area()
        .x(({ i }) => xScale(X[i]))
        .y0(([y1]) => yScale(y1))
        .y1(([, y2]) => yScale(y2));

    let path = svg
        .append('g')
        .selectAll('path')
        .data(stackSeries)
        .enter()
        .append("path")
        .attr("class", "theme_area")
        .attr('fill', ([{ i }]) => color(Z[i]))
        .attr('d', areaGenerator)

    path.append('title')
        .text(([{ i }]) => Z[i]);




    // create a tooltip
    var Tooltip = svg
        .append("text")
        .attr("x", 10)
        .attr("y", 10)
        .style("opacity", 0)
        .style("font-size", 17);

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
        Tooltip.style("opacity", 1)
        d3.selectAll(".theme_area").style("opacity", .2)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
    }
    var mousemove = function (d, i) {
        grp = d.currentTarget.textContent
        Tooltip.text(grp)

        const xPixel = d.x - 355;
        const hoveredDate = xScale.invert(xPixel);
        update_bar_graph(filteredData, hoveredDate, color);
    }
    var mouseleave = function (d) {
        Tooltip.style("opacity", 0)
        d3.selectAll(".theme_area").style("opacity", 1).style("stroke", "none")
    }
    var mouseclick = function (d, i) {
        const xPixel = d.x - 355;
        const hoveredDate = xScale.invert(xPixel);
        focus_root_theme(d.currentTarget.textContent, hoveredDate);
    }

    svg.selectAll('.theme_area')
        .on("click", mouseclick)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .data(stackSeries)
        .enter()
        .append("path")
        .attr("class", "theme_area")
        .style("fill", function (d) { return color(d.key); })
        .attr("d", areaGenerator)


}




function focus_root_theme(rootTheme, hoveredDate) {
    let config = {
        download: true,
        dynamicTyping: true,
        header: true,
        complete: function (results) {
            let dataAsArray = Array.from(results.data);
            var formattedHierarchyData = FormatHierarchyData(Math.round(hoveredDate), dataAsArray);
            var filteredData = formattedHierarchyData.filter(d => d.name == rootTheme);
            display_hierarchy_tree(filteredData[0], hoveredDate, rootTheme);
        }
    }

    Papa.parse(hierarchyDataUrl, config)
}



function display_hierarchy_tree(data, hoveredDate, rootTheme) {

    d3.select(tree_graph_id).selectChildren().remove();

    let format = d3.format(",");
    columns = [
        {
            label: "Pieces",
            value: d => d.num_parts,
            format,
            x: 450
        },
        {
            label: "Count",
            value: d => d.children ? 0 : 1,
            format: (value, d) => d.children ? format(value) : "-",
            x: 510
        }];

    let i = 0;
    let = root = d3.hierarchy(data).eachBefore(d => d.index = i++);

    const nodes = root.descendants();

    let label = d3.selectAll(tree_label_id)
    label.selectAll("div").remove();
    label.append("div")
        .text("Selected parent theme:")
        .style("font-size", "17px")
        .style("font-weight", "bold")
        .style("color", "#4f77b3");
        

    label.append("div")
        .text(rootTheme)
        .style("font-size", "22px")
        .style("font-weight", 100);

    label.append("div")
        .text("Selected year:")
        .style("font-size", "17px")
        .style("font-weight", "bold")
        .style("color", "#4f77b3");
        

    label.append("div")
        .text(Math.round(hoveredDate))
        .style("font-size", "17px")
        .style("font-weight", 100);
    

    const svg = d3.select(tree_graph_id).append("svg")
        .attr("viewBox", [-tree_chart_node_size / 2, -tree_chart_node_size * 3 / 2, tree_chart_width, (nodes.length + 1) * tree_chart_node_size])
  //      .attr("font-family", "sans-serif")
        .attr("font-size", 16)
        .style("overflow", "visible")
          

    const link = svg.append("g")

        .attr("fill", "none")
        .attr("stroke", "#999")
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("d", d => `
          M${d.source.depth * tree_chart_node_size},${d.source.index * tree_chart_node_size}
          V${d.target.index * tree_chart_node_size}
          h${tree_chart_node_size}
        `);

    const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("transform", d => `translate(0,${d.index * tree_chart_node_size})`);

    node.append("circle")
        .attr("cx", d => d.depth * tree_chart_node_size)
        .attr("r", 2.5)
        .attr("fill", d => d.children ? null : "#999");

    node.append("text")
        .attr("dy", ".32em")
        .attr("x", d => d.depth * tree_chart_node_size + 6)
        .text(d => (d.data.set_name));

    node.append("title")
        .text(d => d.ancestors().reverse().map(d => d.data.name).join("/"));

    for (const { label, value, format, x } of columns) {
        svg.append("text")
            .attr("dy", "0.32em")
            .attr("y", -tree_chart_node_size)
            .attr("x", x)
            .attr("text-anchor", "end")
            .attr("font-weight", "bold")
            .text(label);

        node.append("text")
            .attr("dy", "0.32em")
            .attr("x", x)
            .attr("text-anchor", "end")
            .attr("fill", d => d.children ? null : "#555")
            .data(root.copy().sum(value).descendants())
            .text(d => format(d.value, d));

    }
}

function update_bar_graph(data, year, color) {

    d3.select(bar_graph_id).selectChildren().remove();

    let margin = { top: 20, right: 50, bottom: 0, left: 200 },
   //     width = Math.min(500, 40 * data.length),
        width = bar_chart_width + margin.left + margin.right,
        height = bar_chart_height + margin.top + margin.bottom;

    let filteredData = data
        .filter(entry => entry.year == Math.round(year));

    let orderedData = filteredData.sort((a, b) => a.num_set_per_year - b.num_set_per_year);

    // // x axis
    const xType = d3.scaleLinear;
    const xRange = [0, width]

    // // y axis
    const yType = d3.scaleBand;
    const yRange = [height, 80]

    const xDomain = d3.extent(data, d => d.num_set_per_year);
    const yDomain = orderedData.map(d => d.root_theme_name); // d3.range(availableThemes.length);

    let xScale = xType(xDomain, xRange);
    let yScale = yType(yDomain, yRange).padding(0.1);
    const yAxis = d3
        .axisLeft(yScale)
        .ticks(yDomain.length)
        .tickSizeInner(17)

    // append the svg object to the body of the page
    let svg = d3.select(bar_graph_id)
        .append("svg")
        .attr("width", width + margin.left + margin.right) // width + margin.left + margin.right
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")")

    // Selected Year label:
    svg.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .text("Hovered year:")
        .style("font-size", "17px")
        .style("font-weight", "bold")
        .style("fill", "#4f77b3");

    svg.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .text(Math.round(year))
        .style("font-size", "30px");
    // more label
    svg.append("text")
        .attr("x", 0)
        .attr("y", 60)
        .text("Number of sets per year:")
        .style("font-size", "17px")
        .style("font-weight", "bold")
        .style("fill", "#4f77b3");


    svg.append("g")
        .attr("transform",
            "translate(" + 0 + "," + margin.top + ")")
        .call(yAxis)


    let rect = svg.selectAll('rect')
        .data(orderedData);

    const yValue = d => d.root_theme_name;
    rect.enter()
        .append("rect")
        .attr("width", d => xScale(d.num_set_per_year))
        .attr("height", yScale.bandwidth())
        .attr('x', d => xScale(d.root_theme_name))
        .attr('y', d => yScale(d.root_theme_name))
        .attr('fill', d => color !== undefined ? color(yValue(d)) : 'black');

    svg
        .append('g')
        .selectAll("text")
        .data(orderedData)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .attr("font-size", "15px")
        .attr("fill", "white")
        .attr("stroke-width", ".2px")
        .text(d => d.num_set_per_year)
        .attr("x", d => xScale(d.num_set_per_year) - 15)
        .attr("y", (d, i) => yScale(d.root_theme_name) + yScale.bandwidth() / 2)

}

function FormatHierarchyData(yearToFilter, data) {

    let rootThemes = [...new Map(
        data.filter(d => d.parent_id == null)
            .map(d => [d.theme_id, d]))];

    let output = []

    for (let i = 0; i < rootThemes.length; i++) {

        let rootTheme = rootThemes[i];

        if (rootTheme[0] === undefined)
            continue;

        let node = {
            name: rootTheme[1].theme_name,
            children: RecursiveNodeFormatter(rootTheme[0], yearToFilter, data)
        };

        output.push(node);
    }

    return output;
}

function RecursiveNodeFormatter(theme_id, yearToFilter, data) {

    if (theme_id === undefined)
        return;

    var setsWithThemeId = [...new Map(
        data.filter(d => d.parent_id == theme_id)
            .map(d => [d.theme_id, d]))];

    let output = [];

    for (let i = 0; i < setsWithThemeId.length; i++) {

        let rootTheme = setsWithThemeId[i];

        let node = {
            set_name: rootTheme[1].theme_name,
            children: RecursiveNodeFormatter(rootTheme[0], yearToFilter, data)
        };

        if (node.children.length > 0)
            output.push(node);
        // for (let j = 0; j < theme_id.length; j++) {
        //     node.children.push(RecursiveNodeFormatter(theme_ids[j], data.filter(d => d.parent_id == theme_ids[j])));
        // };
    }

    output = output.concat(data.filter(d => d.theme_id == theme_id && d.year == yearToFilter));

    if (output.length == 0)
        return [];
    return output;
}

function FormatStreamData(data, keys) {
    var output = [];

    const years = [...new Set(d3.map(data, d => d.year))];

    const yearsFiltered = years.filter(d => d !== undefined);

    let minYears = yearsFiltered.reduce((prev, curr) => prev < curr ? prev : curr);
    let maxYears = yearsFiltered.reduce((prev, curr) => prev > curr ? prev : curr);

    for (let currentYear = minYears; currentYear <= maxYears; currentYear++) {
        for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {

            let yearData = data.filter(d => d.year == currentYear);
            let containsValue = yearData.find(d => d.root_theme_name == keys[keyIndex]);
            let newEntry = {
                year: currentYear,
                root_theme_name: keys[keyIndex],
                num_set_per_year: containsValue ? containsValue.num_set_per_year : 0
            }
            output.push(newEntry);
        }
    }

    return output;
}

let config_table = {
    download: true,
    dynamicTyping: true,
    header: true,
    complete: function (results) {
        let dataAsArray = Array.from(results.data);
        generate_table_checkbox(dataAsArray, chosenThemes);
        
    }
}

Papa.parse(tableDataUrl, config_table)
