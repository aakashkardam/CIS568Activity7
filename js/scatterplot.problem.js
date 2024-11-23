function scatter_plot(data, ax, title = "", xCol = "", yCol = "", rCol = "", legend = [], colorCol = "", margin = 50) {
    const X = data.map(d => +d[xCol]);
    const Y = data.map(d => +d[yCol]);
    const R = data.map(d => +d[rCol]);

    const colorCategories = [...new Set(data.map(d => d[colorCol]))];
    const color = d3.scaleOrdinal()
        .domain(colorCategories)
        .range(d3.schemeTableau10);

    // Global active categories for legend filtering
    if (!window.activeLegendCategories) {
        window.activeLegendCategories = new Set(colorCategories); // Start with all categories active
    }

    const xExtent = d3.extent(X);
    const yExtent = d3.extent(Y);

    const xMargin = (xExtent[1] - xExtent[0]) * 0.05;
    const yMargin = (yExtent[1] - yExtent[0]) * 0.05;

    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xMargin, xExtent[1] + xMargin])
        .range([margin, 1000 - margin]);

    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yMargin, yExtent[1] + yMargin])
        .range([1000 - margin, margin]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(R))
        .range([6, 14]);

    const Fig = d3.select(`${ax}`);

    // Add scatter plot circles
    Fig.selectAll('.markers')
        .data(data)
        .join('g')
        .attr('transform', d => `translate(${xScale(d[xCol])}, ${yScale(d[yCol])})`)
        .append('circle')
        .attr("class", d => `${d[colorCol].replace(/\s/g, "_")}`)
        .attr("r", d => rScale(d[rCol]))
        .attr("fill", d => color(d[colorCol]))
        .attr("opacity", d => (window.activeLegendCategories.has(d[colorCol]) ? 0.8 : 0.2));

    // Add x and y axes
    const x_axis = d3.axisBottom(xScale).ticks(4);
    const y_axis = d3.axisLeft(yScale).ticks(4);

    Fig.append("g")
        .attr("transform", `translate(${0},${1000 - margin})`)
        .call(x_axis);

    Fig.append("g")
        .attr("transform", `translate(${margin},${0})`)
        .call(y_axis);

    // Add axis labels
    Fig.append("g")
        .attr("transform", `translate(${500},${1000 - 10})`)
        .append("text")
        .text(xCol)
        .attr("fill", "black")
        .style("font-size", "16px");

    Fig.append("g")
        .attr("transform", `translate(${35},${500}) rotate(270)`)
        .append("text")
        .text(yCol)
        .attr("fill", "black")
        .style("font-size", "16px");

    // Add plot title
    Fig.append('text')
        .attr('x', 500)
        .attr('y', 80)
        .attr("text-anchor", "middle")
        .text(title)
        .attr("fill", "black")
        .style("font-size", "18px")
        .style("font-weight", "bold");

    // Add legend
    const legendContainer = Fig.append("g")
        .attr("transform", `translate(${800},${margin})`);

    legend.forEach((category, index) => {
        const legendItem = legendContainer.append("g")
            .attr("transform", `translate(0, ${index * 30})`);

        // Add legend rectangle
        legendItem.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 25)
            .attr("height", 25)
            .attr("fill", color(category))
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("click", () => toggleCategory(category));

        // Add legend text
        legendItem.append("text")
            .attr("x", 30)
            .attr("y", 20)
            .text(category)
            .attr("fill", "black")
            .style("font-size", "18px")
            .style("cursor", "pointer")
            .on("click", () => toggleCategory(category));
    });

    // Brushing functionality
    const brush = d3.brush()
        .on("start", brushStart)
        .on("brush end", brushed)
        .extent([
            [margin, margin],
            [1000 - margin, 1000 - margin]
        ]);

    Fig.call(brush);

    function brushStart() {
        d3.selectAll("circle").classed("selected", false);
        d3.select("#selected-list").selectAll("li").remove();
    }

    function brushed(event) {
        const selection = event.selection;
        if (!selection) return;

        const [[x0, y0], [x1, y1]] = selection;
        const X1 = xScale.invert(x0);
        const X2 = xScale.invert(x1);
        const Y1 = yScale.invert(y1);
        const Y2 = yScale.invert(y0);

        const selectedModels = [];
        const selectedData = [];

        Fig.selectAll("circle")
            .classed("selected", (d) => {
                const isSelected = d[xCol] >= X1 && d[xCol] <= X2 && d[yCol] >= Y1 && d[yCol] <= Y2;
                if (isSelected) {
                    selectedModels.push(d.Model);
                    selectedData.push(d);
                }
                return isSelected;
            });

        // Sync selection with other scatter plots
        d3.selectAll("circle").classed("selected", (d) => selectedModels.includes(d.Model));

        updateList(selectedData);
    }

    function updateList(selectedData) {
        const listBox = d3.select("#selected-list");
        listBox.selectAll("li").remove();
        listBox.selectAll("li")
            .data(selectedData)
            .enter()
            .append("li")
            .text(d => `${d.Model} - ${d.Type}`);
    }

    function toggleCategory(category) {
        const isActive = window.activeLegendCategories.has(category);

        if (isActive) {
            window.activeLegendCategories.delete(category);
        } else {
            window.activeLegendCategories.add(category);
        }

        // Update circle visibility across all plots
        d3.selectAll("circle").attr("opacity", d => {
            return window.activeLegendCategories.has(d[colorCol]) ? 0.8 : 0.2;
        });

        // Sync legend rectangles and text for the toggled category across all plots
        d3.selectAll("rect").filter(function () {
            return d3.select(this.parentNode).select("text").text() === category;
        }).attr("opacity", isActive ? 0.5 : 1);
    }
}