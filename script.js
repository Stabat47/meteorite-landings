const svg = d3.select("#map");
const tooltip = d3.select("#tooltip");

// Responsive dimensions
let width = parseInt(d3.select("#map-container").style("width"));
let height = width * 0.6; // maintain aspect ratio
svg.attr("width", width).attr("height", height);

// Projection and path
const projection = d3.geoNaturalEarth1()
  .scale(width / 1.8)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Container for zooming
const g = svg.append("g");

// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => g.attr("transform", event.transform));

svg.call(zoom);

// Load world map data
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(worldData => {
  const countries = topojson.feature(worldData, worldData.objects.countries).features;

  g.selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", "#cce5df")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

  // Load meteorite data
  d3.json("https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/meteorite-strike-data.json")
    .then(data => {
      const meteorites = data.features;

      const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(meteorites, d => +d.properties.mass || 0)])
        .range([1, 15]);

      g.selectAll("circle")
        .data(meteorites)
        .join("circle")
        .attr("class", "meteorite")
        .attr("cx", d => {
          const coords = projection([+d.properties.reclong, +d.properties.reclat]);
          return coords ? coords[0] : -100;
        })
        .attr("cy", d => {
          const coords = projection([+d.properties.reclong, +d.properties.reclat]);
          return coords ? coords[1] : -100;
        })
        .attr("r", d => radiusScale(+d.properties.mass || 0))
        .attr("fill", "tomato")
        .attr("opacity", 0.6)
        .on("mouseover", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`
            <strong>${d.properties.name}</strong><br>
            Mass: ${d.properties.mass || "Unknown"} g<br>
            Year: ${d.properties.year ? d.properties.year.slice(0,4) : "Unknown"}
          `);

          // Increase radius on hover
          d3.select(this)
            .attr("r", radiusScale(+d.properties.mass || 0) * 1.3)
            .attr("opacity", 0.9);
        })
        .on("mousemove", function(event) {
          const [mouseX, mouseY] = d3.pointer(event, svg.node());
          const tooltipWidth = tooltip.node().offsetWidth;
          const tooltipHeight = tooltip.node().offsetHeight;
          let left = mouseX + 15;
          let top = mouseY - tooltipHeight - 10;

          if (left + tooltipWidth > width) left = mouseX - tooltipWidth - 15;
          if (top < 0) top = mouseY + 15;

          tooltip.style("left", left + "px")
                 .style("top", top + "px");
        })
        .on("mouseout", function(event, d) {
          tooltip.transition().duration(200).style("opacity", 0);
          // Reset radius and opacity
          d3.select(this)
            .attr("r", radiusScale(+d.properties.mass || 0))
            .attr("opacity", 0.6);
    });
  });
});

// Make responsive on window resize
window.addEventListener("resize", () => {
  width = parseInt(d3.select("#map-container").style("width"));
  height = width * 0.6;
  svg.attr("width", width).attr("height", height);
  projection.scale(width / 1.8).translate([width / 2, height / 2]);
  svg.selectAll("path").attr("d", path);
  svg.selectAll("circle")
    .attr("cx", d => {
      const coords = projection([+d.properties.reclong, +d.properties.reclat]);
      return coords ? coords[0] : -100;
    })
    .attr("cy", d => {
      const coords = projection([+d.properties.reclong, +d.properties.reclat]);
      return coords ? coords[1] : -100;
    })
    .attr("r", d => {
      // Keep current hover radius if mouse is over circle
      return d3.select(d3.event?.target).classed("meteorite") && d3.select(d3.event?.target).attr("r") > 0
        ? d3.select(d3.event?.target).attr("r")
        : d3.scaleSqrt()
            .domain([0, +d.properties.mass || 0])
            .range([1, 15])(+d.properties.mass || 0);
    });
});
